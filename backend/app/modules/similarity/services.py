import asyncio
from typing import Any
import uuid
import httpx
import logging
import re
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from app.config import settings
from app.modules.evaluation.repository import EvaluationEventRepository
from app.modules.case.repository import CaseRepository
from app.modules.similarity.schemas import (
    SimilarityResponse,
    SimilarCase,
    PrecedentDetail,
    PrecedentChatRequest,
    PrecedentChatResponse,
)


logger = logging.getLogger(__name__)


class SimilarityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.evaluation_repository = EvaluationEventRepository(db)
        self.case_repository = CaseRepository(db)

    async def find_similar(self, case_id: str) -> SimilarityResponse:
        """
        Find similar cases based on case summary embedding, ANN search, and reranking.
        
        Flow:
        1. Get the case and construct summary_text from title + case_type + employee_name + employer_name
        2. Fetch stored embedding from case_summaries or generate via BGE-M3 (with fallback upsert)
        3. Search Qdrant case_summaries collection (ANN), filtered by case_type, excluding current case
        4. Rerank results using BGE Reranker
        5. Compute confidence scores and return top 5
        6. Emit KPI events
        """
        # Step 1: Get the case
        case = await self.case_repository.get_by_id(case_id)
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case with id {case_id} not found",
            )

        # Construct summary text
        summary_parts = [
            case.title,
            case.case_type.value if case.case_type else "",
            case.claimant_name or "",
            case.respondent_name or "",
        ]
        summary_text = " ".join(part for part in summary_parts if part)

        run_id = str(uuid.uuid4())

        # Step 2: Fetch stored embedding from case_summaries or generate via BGE-M3
        loop = asyncio.get_event_loop()
        query_embedding = None

        def _fetch_active_case_vector():
            """Fetch the stored embedding vector for the active case from case_summaries."""
            client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
            try:
                # Search for the active case's point in case_summaries
                search_filter = Filter(
                    must=[FieldCondition(key="case_id", match=MatchValue(value=case_id))]
                )
                limit = 1
                
                if hasattr(client, "search"):
                    results = client.search(
                        collection_name="case_summaries",
                        query_vector=[0.0] * settings.embedding_dimension,
                        query_filter=search_filter,
                        limit=limit,
                        with_payload=True,
                    )
                else:
                    result = client.query_points(
                        collection_name="case_summaries",
                        query=[0.0] * settings.embedding_dimension,
                        query_filter=search_filter,
                        limit=limit,
                        with_payload=True,
                    )
                    results = result.points if hasattr(result, "points") else result.get("points", []) if isinstance(result, dict) else result
                
                if results and len(results) > 0:
                    point = results[0]
                    if hasattr(point, "vector"):
                        return point.vector
                    elif isinstance(point, dict) and "vector" in point:
                        return point.get("vector")
            except Exception:
                pass
            return None

        # Try to fetch existing vector from case_summaries
        try:
            cached_vector = await loop.run_in_executor(None, _fetch_active_case_vector)
            if cached_vector:
                query_embedding = cached_vector
        except Exception:
            pass

        # If not found, generate embedding via BGE-M3 and upsert
        if not query_embedding:
            async with httpx.AsyncClient(timeout=60.0) as client:
                try:
                    embed_response = await client.post(
                        f"{settings.bge_m3_url}/embed",
                        json={"texts": [summary_text]},
                    )
                    embed_response.raise_for_status()
                    embed_data = embed_response.json()
                except Exception as exc:
                    logger.exception("Similarity embed step failed")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Embedding service failed: {exc}",
                    ) from exc

            if isinstance(embed_data, dict):
                embeddings = embed_data.get("embeddings", [])
                if not embeddings:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Embedding service returned no embeddings: {embed_data}",
                    )
                query_embedding = embeddings[0]
            else:
                if not embed_data:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Embedding service returned empty response",
                    )
                query_embedding = embed_data[0]

            # Fallback: upsert the generated embedding to case_summaries for future use
            try:
                from app.modules.similarity.vector_store import upsert_case_summary
                await upsert_case_summary(
                    case_id=case_id,
                    case_type=case.case_type.value if case.case_type else "",
                    case_title=case.title,
                    claimant=case.claimant_name or "",
                    respondent=case.respondent_name or "",
                    outcome="",
                    embedding=query_embedding,
                )
            except Exception:
                logger.exception("Fallback case summary upsert failed for case_id=%s", case_id)

        # Step 3: ANN search on Qdrant case_summaries collection
        loop = asyncio.get_event_loop()

        def _qdrant_search():
            client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
            
            # Filter by case_type and exclude the current case
            search_filter = Filter(
                must=[
                    FieldCondition(
                        key="case_type",
                        match=MatchValue(value=case.case_type.value)
                    )
                ],
                must_not=[
                    FieldCondition(
                        key="case_id",
                        match=MatchValue(value=case_id)
                    )
                ]
            )
            
            # Fetch 15 candidates (top_k * 3 pattern from search service)
            limit = 15
            
            if hasattr(client, "search"):
                return client.search(
                    collection_name="case_summaries",
                    query_vector=query_embedding,
                    query_filter=search_filter,
                    limit=limit,
                    with_payload=True,
                )

            # Compatibility with newer qdrant-client versions.
            result = client.query_points(
                collection_name="case_summaries",
                query=query_embedding,
                query_filter=search_filter,
                limit=limit,
                with_payload=True,
            )
            if hasattr(result, "points"):
                return result.points
            if isinstance(result, dict):
                return result.get("points", [])
            return result

        try:
            candidates = await loop.run_in_executor(None, _qdrant_search)
        except Exception as exc:
            logger.exception("Similarity qdrant search step failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Qdrant search failed: {exc}",
            ) from exc

        # Extract payloads and embedding similarity scores from candidates
        def _payload(point):
            if hasattr(point, "payload"):
                return point.payload or {}
            if isinstance(point, dict):
                return point.get("payload", {}) or {}
            return {}

        def _score(point):
            if hasattr(point, "score"):
                return point.score
            if isinstance(point, dict):
                return point.get("score", 0.0)
            return 0.0

        # Build list of (payload, embedding_similarity) for reranking
        candidate_list = []
        for point in candidates:
            payload = _payload(point)
            if payload:
                candidate_list.append({
                    "payload": payload,
                    "embedding_similarity": _score(point),
                })

        if not candidate_list:
            # No similar cases found, return empty result with KPI
            try:
                await self.evaluation_repository.create_similarity_event(
                    run_id=run_id,
                    case_id=case_id,
                    metric_type="avg_similarity_score",
                    value=0.0,
                )
                await self.db.commit()
            except Exception as exc:
                logger.exception("Similarity KPI persistence failed")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Similarity KPI logging failed: {exc}",
                ) from exc

            return SimilarityResponse(
                case_id=case_id,
                similar_cases=[],
                run_id=run_id,
            )

        # Step 4: Rerank using BGE Reranker
        # Prepare passages for reranking with case context for better reranking
        rerank_passages = []
        for c in candidate_list:
            payload = c["payload"]
            text = f"{payload.get('claimant', '')} vs {payload.get('respondent', '')} - {payload.get('outcome', '')}"
            rerank_passages.append(text)

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                rerank_response = await client.post(
                    f"{settings.bge_reranker_url}/rerank",
                    json={"query": summary_text, "passages": rerank_passages},
                )
                rerank_response.raise_for_status()
                rerank_data = rerank_response.json()
            except Exception as exc:
                logger.exception("Similarity reranker step failed")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Reranker service failed: {exc}",
                ) from exc

        if isinstance(rerank_data, dict):
            rerank_results = rerank_data.get("results", [])
        else:
            rerank_results = rerank_data

        # Build reranked list with scores
        reranked_items = []
        for item in rerank_results:
            if isinstance(item, dict):
                index = item.get("index")
                reranker_score = float(item.get("score", 0.0))
                if isinstance(index, int) and 0 <= index < len(candidate_list):
                    candidate = candidate_list[index]
                    reranked_items.append({
                        "payload": candidate["payload"],
                        "embedding_similarity": candidate["embedding_similarity"],
                        "reranker_score": reranker_score,
                    })

        # Step 5: Take top-5 and compute confidence scores
        # confidence_score = 0.5 × embedding_similarity + 0.3 × reranker_score + 0.2 × 0.0 (graph_match_score is 0.0 in phase 3)
        top_5 = reranked_items[:5]
        
        similar_cases: list[SimilarCase] = []
        confidence_scores = []
        
        # Fetch Case objects for all candidate case_ids to get authoritative case_title values
        candidate_case_ids = [item["payload"].get("case_id", "") for item in top_5]
        case_titles_map = {}
        for cand_case_id in candidate_case_ids:
            if cand_case_id:
                cand_case = await self.case_repository.get_by_id(cand_case_id)
                if cand_case:
                    case_titles_map[cand_case_id] = cand_case.title
        
        for item in top_5:
            payload = item["payload"]
            embedding_similarity = item["embedding_similarity"]
            reranker_score = item.get("reranker_score", 0.0)
            candidate_case_id = payload.get("case_id", "")
            
            # Compute confidence score
            confidence_score = 0.5 * embedding_similarity + 0.3 * reranker_score + 0.2 * 0.0
            confidence_scores.append(confidence_score)
            
            # Use actual case_title from Case object, or fallback to payload if available
            case_title = case_titles_map.get(candidate_case_id, payload.get("case_title", ""))
            
            similar_cases.append(
                SimilarCase(
                    similar_case_id=candidate_case_id,
                    case_title=case_title,
                    outcome=payload.get("outcome", ""),
                    similarity_score=embedding_similarity,
                    confidence_score=confidence_score,
                )
            )

        # Step 6: Emit KPI events (only avg_similarity_score; top_5_accuracy skipped until labeled)
        avg_similarity_score = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        
        try:
            await self.evaluation_repository.create_similarity_event(
                run_id=run_id,
                case_id=case_id,
                metric_type="avg_similarity_score",
                value=avg_similarity_score,
            )
            await self.db.commit()
        except Exception as exc:
            logger.exception("Similarity KPI persistence failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Similarity KPI logging failed: {exc}",
            ) from exc

        return SimilarityResponse(
            case_id=case_id,
            similar_cases=similar_cases,
            run_id=run_id,
        )

    async def get_precedent(self, precedent_id: str, language: str = "en") -> PrecedentDetail:
        """Fetch full details of a precedent from Qdrant, with language-aware lookup."""
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        point = None

        # Step 1: Try direct UUID fetch
        try:
            is_valid_uuid = False
            try:
                uuid.UUID(precedent_id)
                is_valid_uuid = True
            except ValueError:
                pass

            if is_valid_uuid or precedent_id.isdigit():
                def _get_by_id():
                    return client.retrieve(
                        collection_name="difc_precedents",
                        ids=[precedent_id]
                    )
                res = await asyncio.get_event_loop().run_in_executor(None, _get_by_id)
                point = res[0] if res else None
        except Exception as e:
            logger.warning(f"Direct ID retrieve failed: {e}")

        # Step 2: If language is AR, try to find the Arabic version of this case
        if language == "ar":
            # Get the case_name from the EN version first, then find AR counterpart
            en_payload = point.payload if point and hasattr(point, "payload") else {}
            case_name = en_payload.get("case_name") or en_payload.get("case_title") or ""
            
            if case_name:
                def _find_ar_version():
                    search_filter = Filter(
                        must=[
                            FieldCondition(key="language", match=MatchValue(value="ar")),
                            FieldCondition(key="case_name", match=MatchValue(value=case_name)),
                        ]
                    )
                    results = client.query_points(
                        collection_name="difc_precedents",
                        query_filter=search_filter,
                        limit=1,
                        with_payload=True,
                    )
                    pts = results.points if hasattr(results, "points") else results
                    return pts[0] if pts else None

                ar_point = await asyncio.get_event_loop().run_in_executor(None, _find_ar_version)
                if ar_point:
                    point = ar_point  # use AR version

        # Step 3: Fallback — search by case_id
        if not point:
            def _qdrant_filter_search():
                must_conditions = [
                    FieldCondition(key="case_id", match=MatchValue(value=precedent_id))
                ]
                if language == "ar":
                    must_conditions.append(
                        FieldCondition(key="language", match=MatchValue(value="ar"))
                    )
                search_filter = Filter(must=must_conditions)
                results = client.query_points(
                    collection_name="difc_precedents",
                    query_filter=search_filter,
                    limit=1,
                    with_payload=True,
                )
                points = results.points if hasattr(results, "points") else results
                return points[0] if points else None

            point = await asyncio.get_event_loop().run_in_executor(None, _qdrant_filter_search)

        # Step 4: Final fallback — any version regardless of language
        if not point:
            def _fallback_search():
                search_filter = Filter(
                    must=[FieldCondition(key="case_id", match=MatchValue(value=precedent_id))]
                )
                results = client.query_points(
                    collection_name="difc_precedents",
                    query_filter=search_filter,
                    limit=1,
                    with_payload=True,
                )
                pts = results.points if hasattr(results, "points") else results
                return pts[0] if pts else None

            point = await asyncio.get_event_loop().run_in_executor(None, _fallback_search)

        if not point:
            raise HTTPException(status_code=404, detail="Precedent not found")

        payload = point.payload if hasattr(point, "payload") else point.get("payload", {})
           # Better summary extraction: skip very short fragments or headers
        raw_text = payload.get("raw_text") or payload.get("text") or ""
        summary = (
            payload.get("facts_summary") or 
            payload.get("summary") or 
            payload.get("brief") or 
            payload.get("description")
        )
        
        if not summary and raw_text:
            # Look for a paragraph with substantial content, skipping common header-like fragments
            paragraphs = [p.strip() for p in raw_text.split('\n') if len(p.strip()) > 30]
            for p in paragraphs:
                # Avoid fragments that look like bullet points or short headers
                if len(p) > 100 and not p.lower().startswith(('case no', 'judgment', 'date', 'between', 'ref')):
                    summary = p
                    break
            if not summary and paragraphs:
                summary = paragraphs[0]
            if not summary:
                summary = raw_text[:300].rsplit(' ', 1)[0] + "..."
        
        summary = _cleanse_text(summary) if summary else ""

        # Metadata Fallbacks (Regex extraction if missing in payload)
        outcome = payload.get("outcome") or payload.get("decision")
        if not outcome and raw_text:
            if re.search(r'claim is dismissed|judgment for the respondent|rejected|dismissed in its entirety', raw_text, re.I):
                outcome = "Rejected"
            elif re.search(r'judgment for the claimant|awarded|ordered to pay|entitled to', raw_text, re.I):
                outcome = "Awarded"
            else:
                outcome = "Finalized"

        case_type = payload.get("case_type") or payload.get("type")
        if not case_type and raw_text:
            if re.search(r'unpaid wages|salary|payment of wages|arrears', raw_text, re.I):
                case_type = "Unpaid Wages"
            elif re.search(r'unfair dismissal|termination|end of service', raw_text, re.I):
                case_type = "Termination"

        compensation = payload.get("compensation_amount") or payload.get("compensation") or payload.get("award")
        if not compensation and raw_text:
            amt_match = re.search(r'(?:AED|SAR|USD)\s*([\d,]{3,}(?:\.\d{2})?)', raw_text)
            if amt_match:
                compensation = amt_match.group(0)

        return PrecedentDetail(
            id=precedent_id,
            title=payload.get("case_name") or payload.get("title") or "Unnamed Case",
            year=str(payload.get("year", "")),
            category=payload.get("category"),
            text=raw_text,
            outcome=outcome,
            case_type=case_type,
            summary=summary,
            cited_laws=payload.get("cited_laws") or [],
            compensation=compensation or "N/A",
        )

    async def precedent_chat(self, precedent_id: str, request: PrecedentChatRequest) -> PrecedentChatResponse:
        """Interact with a specific precedent using AI chat (Language-Aware)."""
        detail = await self.get_precedent(precedent_id, language=request.language)
        
        lang_instruction = (
            "يجب أن تجيب باللغة العربية الفصحى القانونية فقط."
            if request.language == 'ar'
            else "Respond in English."
        )
        
        system_prompt = (
            f"You are a legal assistant analyzing the precedent case: {detail.title}.\n"
            f"{lang_instruction}\n"
            "Answer the user's question BASED ONLY on the case text provided below.\n"
            "If the information is not in the text, say you don't know.\n\n"
            "CASE TEXT:\n"
            f"{detail.text}"
        )
        
        # Use Ollama (Qwen) as primary
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                url = f"{settings.ollama_url}/api/chat"
                payload = {
                    "model": "qwen2.5:1.5b-instruct",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": request.message}
                    ],
                    "stream": False
                }
                
                logger.info(f"Sending chat request to Ollama fallback (qwen2.5:1.5b-instruct)")
                response = await client.post(url, json=payload, timeout=300.0)
                response.raise_for_status()
                data = response.json()
                
                answer = data.get("message", {}).get("content", str(data))
                return PrecedentChatResponse(response=answer)
            except Exception as e:
                logger.error(f"Precedent chat fallback failed: {e}")
                raise HTTPException(status_code=502, detail=f"AI service failed to respond: {str(e)}")

def _cleanse_text(text: Any) -> str:
    """Helper to remove common artifacts from AI generated text."""
    if not text: return ""
    text = str(text).strip()
    # Remove markdown code blocks
    text = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", text)
    text = text.replace('```', '')
    return text.strip()
