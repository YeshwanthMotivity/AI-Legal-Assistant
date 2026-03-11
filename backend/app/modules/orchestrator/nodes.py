import json
import logging
import re
from datetime import datetime
from typing import Any

import asyncio
import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.orchestrator.state import AnalysisState

logger = logging.getLogger(__name__)


def _entity_values(entities: list[dict[str, Any]], key: str) -> list[str]:
    return [str(e.get("entity_value", "")).strip() for e in entities if e.get("entity_type") == key and e.get("entity_value")]


def _first_entity(entities: list[dict[str, Any]], key: str) -> str:
    values = _entity_values(entities, key)
    return values[0] if values else ""


def _parse_salary(value: str) -> float:
    filtered = "".join(ch for ch in str(value) if ch.isdigit() or ch == ".")
    if not filtered:
        return 0.0
    try:
        return float(filtered)
    except ValueError:
        return 0.0


def _parse_date(value: str) -> datetime | None:
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None
def _detect_query_language(text: str) -> str:
    arabic_chars = re.findall(r'[\u0600-\u06FF]', text)
    if len(text) > 0 and len(arabic_chars) > len(text) * 0.1:
        return "ar"
    return "en"


async def document_agent_node(state: AnalysisState) -> dict[str, Any]:
    db: AsyncSession = state["db"]
    from app.modules.document.models import Document, ExtractedEntity

    result = await db.execute(
        select(ExtractedEntity).join(Document).where(Document.case_id == state["case_id"])
    )
    rows = list(result.scalars().all())
    entities = [
        {
            "entity_type": row.entity_type,
            "entity_value": row.entity_value,
            "confidence_score": float(row.confidence_score or 0.0),
        }
        for row in rows
    ]
    return {"entities": entities}


async def _build_enriched_query(state: AnalysisState) -> str:
    db: AsyncSession = state["db"]
    from app.modules.case.models import Case
    result = await db.execute(select(Case).where(Case.id == state["case_id"]))
    case = result.scalar_one_or_none()
    
    if not case:
        query = f"case {state['case_id']}"
        state["query_language"] = _detect_query_language(query)
        return query
    
    parts = [
        case.title,
        case.case_type.value if case.case_type else "",
        f"Claimant: {case.claimant_name}" if case.claimant_name else "",
        f"Respondent: {case.respondent_name}" if case.respondent_name else "",
        case.description or "",
        case.notes or ""
    ]
    query = " ".join(p for p in parts if p).strip()
    state["query_language"] = _detect_query_language(query)
    return query


async def search_agent_node(state: AnalysisState) -> dict[str, Any]:
    db: AsyncSession = state["db"]
    query_text = await _build_enriched_query(state)

    from app.modules.search.schemas import SearchRequest
    from app.modules.search.services import SearchService

    try:
        response = await SearchService(db).search(
            SearchRequest(query_text=query_text, case_id=state["case_id"], top_k=5)
        )
        search_results = [
            {"chunk_text": item.chunk_text, "score": item.score, "document_id": item.document_id}
            for item in response.results if item.score > 0.6
        ]
    except Exception:
        search_results = []
    return {"search_results": search_results}


async def precedent_search_node(state: AnalysisState) -> dict[str, Any]:
    db: AsyncSession = state["db"]
    query_text = await _build_enriched_query(state)
    
    # We'll use SearchService but target the 'difc_precedents' collection
    # Note: SearchService currently hardcodes 'legal_chunks'. We need to modify it or use a similar logic here.
    from qdrant_client import QdrantClient
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    
    async def _qdrant_search(query_embedding):
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        # Self-matching protection: Filter out this case_id
        # In seeded precedents, 'case_id' is stored.
        common_filter = Filter(
            must_not=[FieldCondition(key="case_id", match=MatchValue(value=state["case_id"]))]
        )
        
        # Compatibility with newer qdrant-client versions.
        result = client.query_points(
            collection_name="difc_precedents",
            query=query_embedding,
            query_filter=common_filter,
            limit=10,
            with_payload=True,
        )
        return result.points if hasattr(result, "points") else result.get("points", []) if isinstance(result, dict) else result

    try:
        # 1. Embed
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{settings.bge_m3_url}/embed", json={"texts": [query_text]})
            embeddings = resp.json().get("embeddings", []) if isinstance(resp.json(), dict) else resp.json()
            query_vec = embeddings[0]

        # 2. Search
        candidates = await _qdrant_search(query_vec)
        
        # 3. Filter & Rerank (Simplifying rerank call here for brevity, or we can use the service)
        results = []
        for c in candidates:
            payload = c.payload if hasattr(c, "payload") else c.get("payload", {})
            score = c.score if hasattr(c, "score") else c.get("score", 0.0)
            
            doc_language = payload.get("language", "en")
            if state.get("query_language") == doc_language:
                score += 0.05
                
            if score > 0.6:
                results.append({
                    "title": payload.get("case_name", "Unknown Case"),
                    "year": payload.get("year", "N/A"),
                    "category": payload.get("category", "Unspecified"),
                    "text": payload.get("raw_text", "")[:500],
                    "score": score
                })
        return {"precedents": results[:5]}
    except Exception:
        logger.exception("Precedent search failed")
        return {"precedents": []}


async def law_search_node(state: AnalysisState) -> dict[str, Any]:
    query_text = await _build_enriched_query(state)
    from qdrant_client import QdrantClient

    async def _qdrant_search(query_embedding):
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        result = client.query_points(
            collection_name="difc_laws",
            query=query_embedding,
            limit=10,
            with_payload=True,
        )
        return result.points if hasattr(result, "points") else result.get("points", []) if isinstance(result, dict) else result

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{settings.bge_m3_url}/embed", json={"texts": [query_text]})
            embeddings = resp.json().get("embeddings", []) if isinstance(resp.json(), dict) else resp.json()
            query_vec = embeddings[0]

        candidates = await _qdrant_search(query_vec)
        results = []
        for c in candidates:
            payload = c.payload if hasattr(c, "payload") else c.get("payload", {})
            score = c.score if hasattr(c, "score") else c.get("score", 0.0)
            
            doc_language = payload.get("language", "en")
            if state.get("query_language") == doc_language:
                score += 0.05
                
            if score > 0.6:
                results.append({
                    "law_name": payload.get("law_name", "Unknown Law"),
                    "text": payload.get("raw_text", ""),
                    "score": score
                })
        return {"laws": results[:5]}
    except Exception:
        logger.exception("Law search failed")
        return {"laws": []}


async def graph_agent_node(state: AnalysisState) -> dict[str, Any]:
    db: AsyncSession = state["db"]
    from app.modules.graph.schemas import GraphQueryIntent
    from app.modules.graph.services import GraphQueryService

    law_articles: list[dict[str, Any]] = []
    related_cases: list[dict[str, Any]] = []
    graph_confidence = 0.0
    
    # Graph-RAG Bridge: Extract citations from search results to expand graph search
    search_results = state.get("search_results", [])
    extended_citations = []
    for res in search_results:
        text = res.get("chunk_text", "")
        # Look for "Article X" or "Article X(Y)" patterns
        found = re.findall(r"Article\s*\(?(\d+)\)?", text, re.IGNORECASE)
        extended_citations.extend(found)
    
    service = GraphQueryService(db)
    try:
        # Standard graph search
        laws_response = await service.query(state["case_id"], GraphQueryIntent.FIND_RELEVANT_LAWS)
        cases_response = await service.query(state["case_id"], GraphQueryIntent.FIND_RELATED_CASES)
        
        law_articles = [item.model_dump() for item in laws_response.law_articles]
        related_cases = [item.model_dump() for item in cases_response.related_cases]
        
        # If we have citations from search but no graph results yet, try to find cases with those citations
        if not related_cases and extended_citations:
            # This logic would be better inside the service, but adding a quick bridge here
            from neo4j import GraphDatabase
            def _find_by_citations():
                driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))
                with driver.session() as session:
                    # Find cases that cite the law articles found in our semantic chunks
                    result = session.run(
                        "MATCH (l:LawArticle)<-[:CITES]-(c:Case) "
                        "WHERE l.article_number IN $articles AND c.case_id <> $case_id "
                        "RETURN c.case_id AS case_id, c.title AS title, c.outcome AS outcome LIMIT 5",
                        articles=[f"Article {a}" for a in set(extended_citations)],
                        case_id=state["case_id"]
                    )
                    return [{"case_id": r["case_id"], "title": f"{r['title']} (Graph Bridge)", "outcome": r["outcome"]} for r in result]
            
            bridge_cases = await asyncio.get_event_loop().run_in_executor(None, _find_by_citations)
            related_cases.extend(bridge_cases)
            if bridge_cases:
                graph_confidence = 0.7

        graph_confidence = max(graph_confidence, laws_response.graph_confidence, cases_response.graph_confidence)
    except Exception:
        logger.exception("Graph agent failed")
        pass

    return {
        "graph_results": {
            "law_articles": law_articles,
            "related_cases": related_cases,
            "graph_confidence": graph_confidence,
        }
    }


async def calculation_agent_node(state: AnalysisState) -> dict[str, Any]:
    entities = state.get("entities", [])
    salary = _parse_salary(_first_entity(entities, "salary"))
    employment_start = _parse_date(_first_entity(entities, "employment_start"))
    employment_end = _parse_date(_first_entity(entities, "employment_end"))
    termination_reason = _first_entity(entities, "termination_reason")

    years_served = 0.0
    if employment_start and employment_end and employment_end > employment_start:
        years_served = (employment_end - employment_start).days / 365.25

    first_five = min(years_served, 5.0)
    after_five = max(years_served - 5.0, 0.0)
    daily_rate = salary / 30.0 if salary else 0.0
    gratuity = (21.0 * daily_rate * first_five) + (30.0 * daily_rate * after_five)

    terminated_without_notice = "without notice" in termination_reason.lower() if termination_reason else False
    notice_pay = salary if terminated_without_notice else 0.0
    unpaid_wages_flag = bool(_first_entity(entities, "salary"))

    return {
        "calculation": {
            "monthly_salary": salary,
            "years_served": round(years_served, 2),
            "gratuity_estimate": round(gratuity, 2),
            "notice_period_compensation": round(notice_pay, 2),
            "unpaid_wages_flag": unpaid_wages_flag,
        }
    }


async def context_builder_node(state: AnalysisState) -> dict[str, Any]:
    db: AsyncSession = state["db"]
    case_id = state["case_id"]
    
    # 1. Fetch Case Metadata
    from app.modules.case.models import Case
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    
    def safe_val(val: Any) -> str:
        return str(val).strip() if val and str(val).strip() else "Not provided"

    case_metadata = {
        "title": safe_val(case.title if case else ""),
        "claimant": safe_val(case.claimant_name if case else ""),
        "respondent": safe_val(case.respondent_name if case else ""),
        "description": safe_val(case.description if case else ""),
        "notes": safe_val(case.notes if case else ""),
        "claim_amount": safe_val(case.claim_amount if case else ""),
    }

    # 2. Organize Semantic Evidence (Fragments)
    search_texts = []
    seen_search = set()
    for item in state.get("search_results", []):
        t = (item.get("chunk_text") or "").strip()
        if t and t not in seen_search:
            seen_search.add(t)
            search_texts.append(t[:500]) # Cap for performance
        if len(search_texts) >= 3:
            break

    # 3. Organize Legal Authority
    precedents = []
    # From Vector Search (Precedents Collection)
    for p in state.get("precedents", []):
        precedents.append(f"Precedent: {p['title']} ({p['year']}) | Match: {p['score']:.2f}\n{p['text']}")
    
    # From Graph Search (if any)
    graph_results = state.get("graph_results", {})
    for rc in graph_results.get("related_cases", []):
        precedents.append(f"Graph Case: {rc.get('title')} | Outcome: {rc.get('outcome')}")

    laws = []
    # From Vector Search (Laws Collection)
    for l in state.get("laws", []):
        laws.append(f"Statute: {l['law_name']} | Match: {l['score']:.2f}\n{l['text']}")
        
    # From Graph Search
    for l in graph_results.get("law_articles", []):
        laws.append(f"Article {l.get('article_number')}: {l.get('title')}\n{l.get('full_text')}")

    context = {
        "case_metadata": case_metadata,
        "labor_calculation": state.get("calculation", {}),
        "legal_authority": {
            "similar_precedents": precedents,
            "relevant_statutes": laws
        },
        "document_evidence_fragments": search_texts
    }
    
    logger.debug(f"Built multi-source context for case {case_id}")
    return {"context": context}



logger = logging.getLogger(__name__)


async def reasoning_agent_node(state: AnalysisState) -> dict[str, Any]:
    system_prompt = (
        "You are an expert UAE Labor Law Judicial Assistant specializing in DIFC Employment Law.\n"
        "Your task is to analyze the case context and generate a high-quality legal reasoning and draft judgment.\n\n"
        "CONTEXT HIERARCHY:\n"
        "1. CASE METADATA (Primary Facts): Foundation of the case (Parties, Description, Notes).\n"
        "2. RELEVANT STATUTES (High Weight): Articles from DIFC Employment Law. These are binding.\n"
        "3. SIMILAR PRECEDENTS (High Weight): Past judicial decisions. Use these to guide the interpretation of laws.\n"
        "4. DOCUMENT EVIDENCE (Supporting): Fragments from case documents and evidence.\n\n"
        "RULES:\n"
        "- Use standard DIFC Court terminology (Claimant, Respondent, Tribunal, Article).\n"
        "- Cite specific Articles and Precedents found in the context using their identifiers.\n"
        "- If a specific statute is provided, apply it strictly to the facts in metadata.\n"
        "- Return ONLY valid JSON with the exact schema provided below.\n\n"
        "SCHEMA:\n"
        "{\n"
        "  \"outcome\": \"Approved\" | \"Rejected\" | \"Partial\",\n"
        "  \"reasoning\": \"Detailed legal logic linking facts to specific statutes and precedents...\",\n"
        "  \"cited_laws\": [\"Article X\", \"Article Y\"],\n"
        "  \"cited_cases\": [\"Case Name (Citation)\"],\n"
        "  \"confidence\": 0.0 to 1.0,\n"
        "  \"draft_judgment\": \"Full structured draft text in court format (Header, Facts, Law, Conclusion)...\"\n"
        "}"
    )
    user_prompt = json.dumps(
        {
            "case_id": state["case_id"],
            "context": state.get("context", {}),
        },
        ensure_ascii=False,
    )
    payload = {
        "model": "jais",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 1024,
        "options": {
            "num_ctx": 2048,
        },
    }

    async def _call(url: str, timeout_seconds: int) -> str:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return str(data["choices"][0]["message"]["content"])

    def _extract_json_object(raw: str) -> dict[str, Any] | None:
        raw = (raw or "").strip()
        if not raw:
            return None
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            return None
        candidate = match.group(0)
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return None
        return None

    def _normalize_reasoning(content: str, model_used: str, status: str) -> dict[str, Any]:
        parsed = _extract_json_object(content)
        try:
            if not parsed:
                raise ValueError("missing-json")
            result = {
                "outcome": parsed.get("outcome"),
                "reasoning": str(parsed.get("reasoning", "")).strip(),
                "cited_laws": parsed.get("cited_laws", []) if isinstance(parsed.get("cited_laws", []), list) else [],
                "cited_cases": parsed.get("cited_cases", []) if isinstance(parsed.get("cited_cases", []), list) else [],
                "confidence": float(parsed.get("confidence", 0.0) or 0.0),
                "draft_judgment": str(parsed.get("draft_judgment", "")).strip(),
            }
            if not result["draft_judgment"]:
                result["draft_judgment"] = result["reasoning"]
        except Exception as e:
            logger.error(f"JSON parsing failed for {model_used} model output: {e}")
            cleaned = re.sub(r"\{[\s\S]*\}", "", content).strip()
            if not cleaned:
                cleaned = f"Reasoning generated by {model_used} but could not be parsed into strict JSON."
            result = {
                "outcome": None,
                "reasoning": cleaned,
                "cited_laws": [],
                "cited_cases": [],
                "confidence": 0.5,
                "draft_judgment": cleaned,
            }
        result["model_used"] = model_used
        return {
            "reasoning": result,
            "model_used": model_used,
            "reasoning_status": status,
        }

    try:
        logger.info(f"Invoking fallback model (lighter/faster) for case {state['case_id']}")
        fallback_content = await _call(
            f"{settings.fallback_model_url}/v1/chat/completions",
            settings.jais_timeout_seconds,
        )
        return _normalize_reasoning(fallback_content, "fallback", "ok")
    except Exception as e:
        logger.warning(f"Fallback model failed: {e}. Attempting primary (jais)...")
        try:
            jais_content = await _call(
                f"{settings.jais_url}/v1/chat/completions",
                settings.jais_timeout_seconds,
            )
            return _normalize_reasoning(jais_content, "jais", "ok")
        except Exception as e2:
            error_msg = f"Primary and fallback models both failed for case {state['case_id']}: fallback={e}, jais={e2}"
            logger.error(error_msg)
            return {
                "reasoning": {
                    "outcome": None,
                    "reasoning": f"Reasoning unavailable due to model failures. (Technical error: {str(e2)})",
                    "cited_laws": [],
                    "cited_cases": [],
                    "confidence": 0.0,
                    "draft_judgment": "",
                    "model_used": "none",
                },
                "model_used": "none",
                "reasoning_status": "reasoning_unavailable",
                "error": str(e2),
            }


async def explainability_builder_node(state: AnalysisState) -> dict[str, Any]:
    reasoning = state.get("reasoning", {})
    explainability = {
        "cited_law_articles": reasoning.get("cited_laws", []),
        "similar_cases": reasoning.get("cited_cases", []),
        "evidence_chunks": [item.get("chunk_text", "") for item in state.get("search_results", [])],
        "confidence_score": float(reasoning.get("confidence", 0.0) or 0.0),
        "graph_law_articles": state.get("graph_results", {}).get("law_articles", []),
    }
    return {"explainability": explainability}


async def judgment_drafting_agent_node(state: AnalysisState) -> dict[str, Any]:
    reasoning = state.get("reasoning", {})
    draft_content = str(reasoning.get("draft_judgment") or "").strip()
    
    if not draft_content:
        draft_content = reasoning.get("reasoning", "No reasoning provided.")

    # Apply professional Court Template
    court_header = (
        "DIFC COURTS - SMALL CLAIMS TRIBUNAL\n"
        f"CASE ID: {state['case_id']}\n"
        "--------------------------------------------------\n"
        "AI-ASSISTED JUDGMENT DRAFT\n"
        "--------------------------------------------------\n\n"
    )
    
    final_draft = (
        f"{court_header}"
        "1. DISPOSITION AND OUTCOME\n"
        f"The Tribunal's decision is: {reasoning.get('outcome', 'PENDING')}\n\n"
        "2. LEGAL REASONING\n"
        f"{draft_content}\n\n"
        "3. CITED AUTHORITIES\n"
        f"Laws: {', '.join(reasoning.get('cited_laws', []))}\n"
        f"Precedents: {', '.join(reasoning.get('cited_cases', []))}\n\n"
        "--- End of Draft ---"
    )

    from app.modules.ingestion.minio_client import upload_file
    payload = final_draft.encode("utf-8")
    try:
        await upload_file(
            bucket="judgment-drafts",
            key=f"{state['case_id']}/draft.txt",
            data=payload,
            length=len(payload),
            content_type="text/plain; charset=utf-8",
        )
    except Exception:
        # Draft persistence to DB still continues even if object storage is unavailable.
        pass

    return {"draft_text": final_draft}
