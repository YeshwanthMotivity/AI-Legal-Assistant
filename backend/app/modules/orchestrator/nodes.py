import json
import logging
import time
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
# ─────────────────────────────────────────────────────────────────────────────
# SHARED EMBEDDING HELPER
# Called once per pipeline run. All search nodes reuse the result.
# ─────────────────────────────────────────────────────────────────────────────

async def _get_single_embedding(text: str) -> list[float]:
    """Single HTTP call to BGE-M3. Raises on failure so the pipeline can abort early."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.bge_m3_url}/embed",
            json={"texts": [text]}
        )
        resp.raise_for_status()
        data = resp.json()
        embeddings = data.get("embeddings", data) if isinstance(data, dict) else data
        return embeddings[0]


async def _detect_query_language(text: str) -> str:
    arabic_chars = re.findall(r'[\u0600-\u06FF]', text)
    if len(text) > 0 and len(arabic_chars) > len(text) * 0.1:
        return "ar"
    return "en"


# ─────────────────────────────────────────────────────────────────────────────
# TOKEN LIMITS — one place to tune, applies to every model call in the pipeline
# ─────────────────────────────────────────────────────────────────────────────

NODE_TOKEN_LIMITS: dict[str, int] = {
    "reasoning":      512,   # reasoning_agent_node  — was implicitly 2048
    "drafting":       1024,  # judgment_drafting_agent_node
    "explainability": 256,   # explainability_builder_node
    "search":         128,   # any LLM call inside search nodes (future)
}


# ─────────────────────────────────────────────────────────────────────────────
# COMPLEXITY SCORER
# Returns 0.0 (simple) → 1.0 (complex). Threshold ≥ 0.5 triggers JAIS 7B.
# ─────────────────────────────────────────────────────────────────────────────

def _assess_complexity(state: AnalysisState) -> tuple[float, list[str]]:
    """
    Score query complexity to decide which model to use.
    Returns (score, list_of_reasons_for_logging).
    """
    score = 0.0
    reasons: list[str] = []

    # 1. Arabic content — JAIS is specifically trained on Arabic legal text
    #    Reuse query_language already detected in document_agent_node (free)
    if state.get("query_language") == "ar":
        score += 0.35
        reasons.append("Arabic query (+0.35)")

    # 2. Query length — longer queries imply more nuanced fact patterns
    query = state.get("query_text", "")
    word_count = len(query.split())
    if word_count > 80:
        score += 0.25
        reasons.append(f"Long query {word_count} words (+0.25)")
    elif word_count > 40:
        score += 0.10
        reasons.append(f"Medium query {word_count} words (+0.10)")

    # 3. Multiple retrieved evidence sources — complex fact patterns
    num_precedents = len(state.get("precedents", []))
    num_laws = len(state.get("laws", []))
    if num_precedents >= 3 or num_laws >= 3:
        score += 0.20
        reasons.append(f"Rich retrieval: {num_precedents} precedents, {num_laws} laws (+0.20)")

    # 4. High-value claim — complex financial calculations needed
    calculation = state.get("calculation", {})
    gratuity = calculation.get("gratuity_estimate", 0.0)
    if gratuity > 50_000:
        score += 0.10
        reasons.append(f"High-value claim AED {gratuity:,.0f} (+0.10)")

    return min(score, 1.0), reasons


def _select_model(state: AnalysisState) -> tuple[str, str, float]:
    score, reasons = _assess_complexity(state)
    reason_str = " | ".join(reasons) if reasons else "no complexity signals"
    
    # Threshold for JAIS 7B is 0.5.
    if score >= 0.5:
        logger.info(f"Model routing → JAIS 7B (score={score:.2f}) | Case {state['case_id']} | {reason_str}")
        return settings.jais_url, settings.ollama_model_primary, score
    else:
        logger.info(f"Model routing → Qwen 1.5B (score={score:.2f}) | Case {state['case_id']} | {reason_str}")
        return settings.fallback_model_url, settings.ollama_model_fallback, score


async def document_agent_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: document_agent_node starting for case {state['case_id']}")
    db: AsyncSession = state["db"]
    from app.modules.document.models import Document, ExtractedEntity

    # 1. Fetch entities
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

    # 2. Build enriched query ONCE
    query_text = await _build_enriched_query(state)
    logger.info(f"--- Node: document_agent_node built query ({len(query_text)} chars), now embedding...")

    # 3. Embed ONCE
    t_embed = time.time()
    try:
        query_embedding = await _get_single_embedding(query_text)
        logger.info(f"--- Node: document_agent_node embedding finished in {time.time() - t_embed:.2f}s")
    except Exception:
        logger.exception("Embedding failed in document_agent_node — downstream search nodes will be skipped")
        query_embedding = []

    duration = time.time() - start_time
    logger.info(f"--- Node: document_agent_node finished in {duration:.2f}s")

    return {
        "entities": entities,
        "query_text": query_text,           # ← stored in state
        "query_embedding": query_embedding, # ← stored in state
    }


async def _build_enriched_query(state: AnalysisState) -> str:
    db: AsyncSession = state["db"]
    from app.modules.case.models import Case
    result = await db.execute(select(Case).where(Case.id == state["case_id"]))
    case = result.scalar_one_or_none()
    
    if not case:
        query = f"case {state['case_id']}"
        state["query_language"] = await _detect_query_language(query)
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
    state["query_language"] = await _detect_query_language(query)
    return query


async def search_agent_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: search_agent_node starting for case {state['case_id']}")
    db: AsyncSession = state["db"]

    # Use pre-computed values
    query_text = state.get("query_text")
    query_embedding = state.get("query_embedding")

    if not query_embedding:
        logger.warning("search_agent_node: no embedding in state, skipping.")
        return {"search_results": []}

    from app.modules.search.schemas import SearchRequest
    from app.modules.search.services import SearchService

    try:
        response = await SearchService(db).search(
            SearchRequest(query_text=query_text or "", case_id=state["case_id"], top_k=5),
            precomputed_embedding=query_embedding,
        )
        search_results = [
            {"chunk_text": item.chunk_text, "score": item.score, "document_id": item.document_id}
            for item in response.results if item.score > 0.6
        ]
    except Exception as e:
        logger.error(f"Search agent failed for case {state['case_id']}: {e}")
        search_results = []

    duration = time.time() - start_time
    logger.info(f"--- Node: search_agent_node finished in {duration:.2f}s")
    return {"search_results": search_results}


async def precedent_search_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: precedent_search_node starting for case {state['case_id']}")

    query_embedding = state.get("query_embedding")

    if not query_embedding:
        logger.warning("precedent_search_node: no embedding in state, skipping.")
        return {"precedents": []}

    from qdrant_client.models import Filter, FieldCondition, MatchValue

    async def _qdrant_search():
        from qdrant_client import AsyncQdrantClient
        client = AsyncQdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        # Self-matching protection: Filter out this case_id
        must_not = [FieldCondition(key="case_id", match=MatchValue(value=state["case_id"]))]
        # 1. Try with strict language filter
        must = []
        if state.get("query_language"):
            must.append(FieldCondition(key="language", match=MatchValue(value=state["query_language"])))
            
        result = await client.query_points(
            collection_name="difc_precedents",
            query=query_embedding,
            query_filter=Filter(must=must, must_not=must_not),
            limit=10,
            with_payload=True,
        )
        points = result.points if hasattr(result, "points") else (
            result.get("points", []) if isinstance(result, dict) else result
        )

        # 2. Relaxed fallback: if zero results AND we had a language filter, try without it
        if not points and must:
            logger.info(f"--- Node: precedent_search_node found 0 results for language '{state['query_language']}', trying without filter")
            result = await client.query_points(
                collection_name="difc_precedents",
                query=query_embedding,
                query_filter=Filter(must_not=must_not),
                limit=10,
                with_payload=True,
            )
            points = result.points if hasattr(result, "points") else (
                result.get("points", []) if isinstance(result, dict) else result
            )

        await client.close()
        return points

    try:
        candidates = await _qdrant_search()
        
        results = []
        for c in candidates:
            payload = c.payload if hasattr(c, "payload") else c.get("payload", {})
            score = c.score if hasattr(c, "score") else c.get("score", 0.0)
            
            if score > 0.6:
                results.append({
                    "id": str(c.id) if hasattr(c, "id") else str(uuid.uuid4()), # Point ID
                    "case_id": payload.get("case_id", ""),                    # Payload ID
                    "title": payload.get("case_name") or payload.get("title") or "Unknown Case",
                    "year": payload.get("year", "N/A"),
                    "category": payload.get("category", "Unspecified"),
                    "text": payload.get("raw_text", "")[:500],
                    "score": score
                })
        duration = time.time() - start_time
        logger.info(f"--- Node: precedent_search_node finished in {duration:.2f}s")
        return {"precedents": results[:5]}
    except Exception:
        logger.exception("Precedent search failed")
        return {"precedents": []}


async def law_search_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: law_search_node starting for case {state['case_id']}")

    query_embedding = state.get("query_embedding")

    if not query_embedding:
        logger.warning("law_search_node: no embedding in state, skipping.")
        return {"laws": []}

    from qdrant_client.models import Filter, FieldCondition, MatchValue

    async def _qdrant_search():
        from qdrant_client import AsyncQdrantClient
        client = AsyncQdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        # 1. Try with strict language filter
        must = []
        if state.get("query_language"):
            must.append(FieldCondition(key="language", match=MatchValue(value=state["query_language"])))
            
        result = await client.query_points(
            collection_name="difc_laws",
            query=query_embedding,
            query_filter=Filter(must=must),
            limit=10,
            with_payload=True,
        )
        points = result.points if hasattr(result, "points") else (
            result.get("points", []) if isinstance(result, dict) else result
        )

        # 2. Relaxed fallback
        if not points and must:
            logger.info(f"--- Node: law_search_node found 0 results for language '{state['query_language']}', trying without filter")
            result = await client.query_points(
                collection_name="difc_laws",
                query=query_embedding,
                limit=10,
                with_payload=True,
            )
            points = result.points if hasattr(result, "points") else (
                result.get("points", []) if isinstance(result, dict) else result
            )

        await client.close()
        return points

    try:
        candidates = await _qdrant_search()
        results = []
        for c in candidates:
            payload = c.payload if hasattr(c, "payload") else c.get("payload", {})
            score = c.score if hasattr(c, "score") else c.get("score", 0.0)
            
            if score > 0.6:
                results.append({
                    "title": payload.get("law_name") or payload.get("title") or "Unknown Law", # Ensure "title" key
                    "content": payload.get("raw_text") or payload.get("text") or "", # Ensure "content" key
                    "score": score
                })
        duration = time.time() - start_time
        logger.info(f"--- Node: law_search_node finished in {duration:.2f}s")
        return {"laws": results[:5]}
    except Exception:
        logger.exception("Law search failed")
        return {"laws": []}


async def _citation_bridge_async(extended_citations: list[str], case_id: str) -> list[dict[str, Any]]:
    """Neo4j removed — returns empty list."""
    return []

async def _citation_bridge_sync_fallback(extended_citations: list[str], case_id: str) -> list[dict[str, Any]]:
    """Neo4j removed — returns empty list."""
    return []

async def calculation_agent_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: calculation_agent_node starting for case {state['case_id']}")
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

    # Build modern breakdown list for UI
    breakdown = [
        {"label": "Monthly Salary", "value": f"AED {salary:,.2f}"},
        {"label": "Years of Service", "value": f"{years_served:.2f} years"},
        {"label": "Gratuity Estimate", "value": f"AED {gratuity:,.2f}"},
        {"label": "Notice Compensation", "value": f"AED {notice_pay:,.2f}"},
    ]

    res = {
        "calculation": {
            "monthly_salary": salary,
            "years_served": round(years_served, 2),
            "gratuity_estimate": round(gratuity, 2),
            "notice_period_compensation": round(notice_pay, 2),
            "unpaid_wages_flag": unpaid_wages_flag,
            "breakdown": breakdown,
        }
    }
    duration = time.time() - start_time
    logger.info(f"--- Node: calculation_agent_node finished in {duration:.2f}s")
    return res


async def context_builder_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: context_builder_node starting for case {state['case_id']}")
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
    
    laws = []
    # From Vector Search (Laws Collection)
    for l in state.get("laws", []):
        laws.append(f"Statute: {l.get('title') or l.get('law_name')} | Match: {l.get('score', 0):.2f}\n{l.get('content') or l.get('text')}")
        
    context = {
        "case_metadata": case_metadata,
        "labor_calculation": state.get("calculation", {}),
        "legal_authority": {
            "similar_precedents": precedents,
            "relevant_statutes": laws
        },
        "document_evidence_fragments": search_texts
    }
    
    logger.info(
        f"Built context for case {case_id}: "
        f"{len(search_texts)} fragments, "
        f"{len(precedents)} precedents, "
        f"{len(laws)} statutes"
    )
    duration = time.time() - start_time
    logger.info(f"--- Node: context_builder_node finished in {duration:.2f}s")
    return {"context": context}





async def reasoning_agent_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: reasoning_agent_node starting for case {state['case_id']}")

    # ── 1. Route to the right model ──────────────────────────────────────────
    model_url, model_label, complexity_score = _select_model(state)

    # ── 2. Prompts ───────────────────────────────────────────────────────────
    system_prompt = (
        "You are an expert UAE Labor Law Judicial Assistant specializing in DIFC Employment Law.\n"
        "Your task is to analyze the case context and generate a high-quality legal reasoning and draft judgment.\n\n"
        f"IMPORTANT: The analysis is for a case in {state.get('query_language', 'en')} language. "
        "Please respond in the SAME language as the query (Arabic or English).\n\n"
        "CONTEXT HIERARCHY:\n"
        "1. CASE METADATA (Primary Facts): Foundation of the case (Parties, Description, Notes).\n"
        "2. RELEVANT STATUTES (High Weight): Articles from DIFC Employment Law. These are binding.\n"
        "3. SIMILAR PRECEDENTS (High Weight): Past judicial decisions. Use these to guide the interpretation of laws.\n"
        "4. DOCUMENT EVIDENCE (Supporting): Fragments from case documents and evidence.\n\n"
        "RULES:\n"
        "- Return ONLY valid JSON with the exact schema provided below.\n"
        "- FORMATTING: The \"draft_judgment\" MUST be formatted in high-quality HTML.\n\n"
        "SCHEMA:\n"
        "{\n"
        "  \"outcome\": \"Approved\" | \"Rejected\" | \"Partial\",\n"
        "  \"reasoning\": \"Detailed legal logic...\",\n"
        "  \"cited_laws\": [\"Article X\"],\n"
        "  \"cited_cases\": [\"Case Name (Citation)\"],\n"
        "  \"confidence\": 0.0 to 1.0,\n"
        "  \"draft_judgment\": \"Full structured draft in HTML...\"\n"
        "}"
    )
    user_prompt = json.dumps(
        {"case_id": state["case_id"], "context": state.get("context", {})},
        ensure_ascii=False,
    )

    # ── 3. Build payload with per-node token limit ────────────────────────────
    def _build_payload(model_name: str, system: str, user: str) -> dict:
        # Use /api/generate as requested by user
        prompt = f"System: {system}\n\nUser Context: {user}\n\nAssistant Response (JSON ONLY):"
        return {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_ctx": 4096,
                "temperature": 0.1,
                "num_predict": NODE_TOKEN_LIMITS["reasoning"]
            },
        }

    # ── 4. Single HTTP caller with explicit timeout ───────────────────────────
    async def _call(url: str, timeout_seconds: int, model_name: str) -> str:
        logger.info(f"reasoning_agent_node: calling {model_name} at {url} (timeout={timeout_seconds}s)")
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(
                f"{settings.ollama_url}/api/generate",
                json=_build_payload(model_name, system_prompt, user_prompt),
            )
            response.raise_for_status()
            data = response.json()
            # /api/generate returns the response in the "response" field
            return str(data.get("response", data.get("message", {}).get("content", "")))

    # ── 5. JSON parsing helpers ───────────────────────────────────────────────
    # (parsing logic stays same)
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
        # Try finding the largest substring that looks like a JSON object
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            return None
        json_str = match.group(0)
        try:
            parsed = json.loads(json_str)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            # Fallback: try to fix common small model mistakes (missing trailing brace, etc)
            try:
                parsed = json.loads(json_str + "}")
                return parsed if isinstance(parsed, dict) else None
            except Exception:
                return None

    def _normalize_reasoning(content: str, used_label: str, status: str) -> dict[str, Any]:
        def _cleanse_text(text: Any) -> str:
            """Remove markdown code blocks or stringify dicts/lists if needed."""
            if text is None: return ""
            # If it's a dict/list, flatten it to a string first
            if isinstance(text, (dict, list)):
                try:
                    return json.dumps(text, indent=2, ensure_ascii=False)
                except Exception:
                    return str(text)
            
            text = str(text)
            # Remove ```json ... ``` or ``` ... ```
            text = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", text)
            return text.strip()

        parsed = _extract_json_object(content)
        if not parsed:
            if content and len(content) > 50:
                logger.warning(f"{used_label} returned non-JSON, using as raw reasoning.")
                cleansed_content = _cleanse_text(content)
                result = {
                    "outcome": (
                        "Partial" if "partial" in cleansed_content.lower()
                        else "Approved" if "approve" in cleansed_content.lower()
                        else "Rejected"
                    ),
                    "reasoning": cleansed_content if cleansed_content.strip() else "Analysis complete. See draft for details.",
                    "cited_laws": [],
                    "cited_cases": [],
                    "confidence": 0.5,
                    "draft_judgment": cleansed_content,
                }
            else:
                result = {
                    "outcome": None,
                    "reasoning": f"Reasoning unavailable — {used_label} returned insufficient content.",
                    "cited_laws": [],
                    "cited_cases": [],
                    "confidence": 0.85,
                    "draft_judgment": "",
                }
        else:
            # Robust outcome extraction
            outcome = parsed.get("outcome")
            if not outcome:
                # Try to guess from reasoning if missing in JSON
                reasoning_val = parsed.get("reasoning", "")
                reasoning_text = str(reasoning_val).lower() if not isinstance(reasoning_val, (dict, list)) else ""
                if "approve" in reasoning_text: outcome = "Approved"
                elif "reject" in reasoning_text: outcome = "Rejected"
                elif "partial" in reasoning_text: outcome = "Partial"
            
            result = {
                "outcome":        outcome,
                "reasoning":      _cleanse_text(parsed.get("reasoning", "")) or "Analysis complete. See draft for details.",
                "cited_laws":     parsed.get("cited_laws", []) if isinstance(parsed.get("cited_laws"), list) else [],
                "cited_cases":    parsed.get("cited_cases", []) if isinstance(parsed.get("cited_cases"), list) else [],
                "confidence":     (lambda c: c/100.0 if c > 1.0 else c)(float(str(parsed.get("confidence", 0.85)).replace("%","") or 0.85)),
                "draft_judgment": _cleanse_text(parsed.get("draft_judgment", content)),
            }
            if not result["draft_judgment"] or len(result["draft_judgment"]) < 20:
                result["draft_judgment"] = result["reasoning"]

        result["model_used"] = used_label
        result["complexity_score"] = round(complexity_score, 2)

        # Build final state payload
        law_articles = [l.get("law_name") for l in state.get("laws", []) if l.get("law_name")]
        
        similar_precedents = [
            {
                "caseId": p.get("case_id") or p.get("id"),
                "title": p.get("title"),
                "similarityScore": p.get("score", 0.0),
            }
            for p in state.get("precedents", [])
        ]

        duration = time.time() - start_time
        logger.info(
            f"--- Node: reasoning_agent_node finished in {duration:.2f}s "
            f"| model={used_label} | complexity={complexity_score:.2f} | status={status}"
        )
        return {
            "reasoning":         result,
            "law_articles":      law_articles,
            "similar_precedents": similar_precedents,
            "reasoning_status":  status,
            "model_used":        used_label,
            "complexity_score":  round(complexity_score, 2),
        }

    # ── 6. Execution: routed model → Qwen fallback → error ───────────────────

    # Determine timeouts
    JAIS_HARD_TIMEOUT  = 90
    QWEN_TIMEOUT       = 300
    FALLBACK_MODEL     = settings.ollama_model_fallback

    primary_timeout = JAIS_HARD_TIMEOUT if "jais" in model_url else QWEN_TIMEOUT

    try:
        content = await _call(model_url, primary_timeout, model_label)
        return _normalize_reasoning(content, model_label, "ok")

    except Exception as e_primary:
        logger.warning(f"reasoning_agent_node: {model_label} failed ({repr(e_primary)}) — trying Qwen fallback")
        if model_label != FALLBACK_MODEL:
            try:
                # IMPORTANT: Use the fallback model name explicitly here
                content = await _call(settings.fallback_model_url, QWEN_TIMEOUT, FALLBACK_MODEL)
                return _normalize_reasoning(content, FALLBACK_MODEL, "error_fallback")
            except Exception as e_fallback:
                logger.error(f"Both models failed: primary={repr(e_primary)}, fallback={repr(e_fallback)}")
                return _error_result(state, start_time, complexity_score, repr(e_fallback))
        else:
            return _error_result(state, start_time, complexity_score, repr(e_primary))


def _error_result(
    state: AnalysisState,
    start_time: float,
    complexity_score: float,
    error_repr: str,
) -> dict[str, Any]:
    """Consistent error shape — keeps the API contract intact even on total failure."""
    duration = time.time() - start_time
    logger.error(f"--- Node: reasoning_agent_node FAILED in {duration:.2f}s | {error_repr}")
    return {
        "reasoning": {
            "outcome":        None,
            "reasoning":      f"Reasoning unavailable. (Error: {error_repr})",
            "cited_laws":     [],
            "cited_cases":    [],
            "confidence":     0.85,
            "draft_judgment": "",
            "model_used":     "none",
            "complexity_score": round(complexity_score, 2),
        },
        "law_articles":       [],
        "similar_precedents": [],
        "reasoning_status":   "reasoning_unavailable",
        "model_used":         "none",
        "error":              error_repr,
    }



async def explainability_builder_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: explainability_builder_node starting for case {state['case_id']}")
    reasoning = state.get("reasoning", {})
    # Align with keys expected by OrchestratorService.run_analysis and get_case_analysis
    # Use search results from state if the LLM didn't provide specific citations
    # Ensure law articles are always objects with title/content
    def _to_article_obj(item):
        if isinstance(item, dict):
            return {
                "title": item.get("title") or item.get("law_name") or item.get("article_number") or "Article",
                "content": item.get("content") or item.get("text") or item.get("raw_text") or "Article Details"
            }
        return {"title": str(item), "content": "Citations mapped from primary case analysis."}

    raw_laws = reasoning.get("cited_laws") or state.get("laws", [])
    law_articles = [_to_article_obj(l) for l in raw_laws]

    explainability = {
        "law_articles": law_articles,
        "similar_precedents": reasoning.get("cited_cases") or state.get("precedents", []),
        "evidence_chunks": [item.get("chunk_text", "") for item in state.get("search_results", [])],
        "confidence_score": (lambda c: c/100.0 if c > 1.0 else c)(float(str(reasoning.get("confidence", 0.85)).replace("%","") or 0.85)),
    }
    duration = time.time() - start_time
    logger.info(f"--- Node: explainability_builder_node finished in {duration:.2f}s")
    return {"explainability": explainability}


async def judgment_drafting_agent_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: judgment_drafting_agent_node starting for case {state['case_id']}")
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
    
    # Ensure citations are joined as strings even if they are objects
    def _to_str(item):
        if isinstance(item, dict):
            return item.get("title") or item.get("case_name") or item.get("law_name") or str(item)
        return str(item)

    laws_cited = ", ".join([_to_str(l) for l in reasoning.get("cited_laws", [])])
    cases_cited = ", ".join([_to_str(c) for c in reasoning.get("cited_cases", [])])

    final_draft = (
        f"{court_header}"
        "1. DISPOSITION AND OUTCOME\n"
        f"The Tribunal's decision is: {reasoning.get('outcome') or 'PENDING'}\n\n"
        "2. LEGAL REASONING\n"
        f"{draft_content}\n\n"
        "3. CITED AUTHORITIES\n"
        f"Laws: {laws_cited}\n"
        f"Precedents: {cases_cited}\n\n"
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

    duration = time.time() - start_time
    logger.info(f"--- Node: judgment_drafting_agent_node finished in {duration:.2f}s")
    return {"draft_text": final_draft}
