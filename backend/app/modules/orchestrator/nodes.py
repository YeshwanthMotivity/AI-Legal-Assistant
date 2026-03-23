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
# 0. Global Setup: Hallucination Guards
# ─────────────────────────────────────────────────────────────────────────────

def _is_hallucination(text: str) -> bool:
    """Detects any variation of [object Object] or similar LLM artifacts."""
    if not text:
        return False
    # Catch [object Object], [OBJECT OBJECT], [ object object ], etc.
    pattern = r'\[\s*object\s+object\s*\]'
    return bool(re.search(pattern, text, re.IGNORECASE))

# ─────────────────────────────────────────────────────────────────────────────
# 0. Global Setup: Embeddings & Models
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

# (Removed redundant complexity scoring block and moved definition closer to usage)


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
            
            title = str(payload.get("law_name") or payload.get("title") or "Unknown Law")
            content = str(payload.get("raw_text") or payload.get("text") or "")

            # Hallucination filter at search level
            if _is_hallucination(title) or _is_hallucination(content):
                continue

            if score > 0.6:
                results.append({
                    "title": title,
                    "content": content,
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





def _extract_json_object(raw: str) -> dict[str, Any] | None:
    """Find and parse the largest JSON object in a string, with basic malformation recovery."""
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

def _cleanse_text(text: Any) -> str:
    """Remove markdown code blocks, stringify dicts/lists, and handle nested JSON strings."""
    if text is None: return ""
    
    if not text:
        return ""
    
    # If it is a dict or list, we must flatten it to a readable sentence/bullet list
    # instead of just doing json.dumps (which looks bad to users)
    if isinstance(text, (dict, list)):
        return _flatten_to_text(text)

    text = str(text).strip()
    
    # Guard against common hallucination artifacts
    if _is_hallucination(text):
        if len(text) < 50: 
            return "" # Discard if exclusively hallucination
        # Replace the artifact part
        text = re.sub(r'\[\s*object\s+object\s*\]', "", text, flags=re.IGNORECASE)

    # Remove markdown code blocks
    text = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", text)
    text = text.replace('```', '')
    
    # Recursive JSON attempt (in case of double encoded strings)
    if text.startswith("{") or text.startswith("["):
        try:
            parsed_nested = json.loads(text)
            return _flatten_to_text(parsed_nested)
        except:
            pass
    
    return text.strip()


def _flatten_to_text(data: Any, indent: int = 0) -> str:
    """Converts structured dicts/lists into clean, human-readable legal text."""
    if not data: return ""
    if indent > 5: return str(data) # Avoid deep recursion
    
    if isinstance(data, dict):
        lines = []
        for key, value in data.items():
            k = str(key).replace("_", " ").title()
            if isinstance(value, (dict, list)):
                v = _flatten_to_text(value, indent + 1)
                lines.append(f"{'  ' * indent}• {k}:\n{v}")
            else:
                lines.append(f"{'  ' * indent}• {k}: {value}")
        return "\n".join(lines)
        
    if isinstance(data, list):
        if all(isinstance(i, (str, int, float)) for i in data):
            return "\n".join([f"{'  ' * indent}- {i}" for i in data])
        return "\n".join([_flatten_to_text(i, indent + 1) for i in data])
        
    return str(data)


def _select_model(state: AnalysisState) -> tuple[str, str, float]:
    """Determines the best model for the case complexity."""
    precedents = state.get("precedents", [])
    laws = state.get("laws", [])
    
    # Base complexity score
    complexity_score = 0.3
    if len(precedents) > 3: complexity_score += 0.2
    if len(laws) > 5: complexity_score += 0.2
    if len(state.get("context", {}).get("case_metadata", {}).get("description", "")) > 1000:
        complexity_score += 0.2
        
    # Qwen (fast) as primary, JAIS (robust) for HIGH complexity cases (>0.7)
    if complexity_score > 0.7:
        model_url = settings.ollama_url
        model_label = "jwnder/jais-adaptive:7b"
    else:
        model_url = settings.ollama_url
        model_label = "qwen2.5:1.5b-instruct"
        
    return model_url, model_label, complexity_score


async def reasoning_agent_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: reasoning_agent_node starting for case {state['case_id']}")

    # ── 1. Route to the right model ──────────────────────────────────────────
    model_url, model_label, complexity_score = _select_model(state)

    # ── 2. Prompts ───────────────────────────────────────────────────────────
    system_prompt = (
        "You are a Chief Legal Officer for DIFC UAE Labor Law. Provide a precise, professional legal analysis in JSON format.\n"
        f"Language: {state.get('query_language', 'en')}.\n\n"
        "RESPONSE SCHEMA (STRICT):\n"
        "{\n"
        "  \"outcome\": \"Approved\" | \"Rejected\",\n"
        "  \"reasoning\": \"Step-by-step legal justification. USE PLAIN TEXT ONLY. NO JSON OR OBJECTS INSIDE.\",\n"
        "  \"cited_laws\": [\"Exact name/Article number of applicable UAE/DIFC Laws\"],\n"
        "  \"cited_cases\": [\"Case References or Precedents\"],\n"
        "  \"confidence\": 0.0 to 1.0,\n"
        "  \"draft_judgment\": \"Formal court-ready text. High-quality legal English. NO JSON structures.\"\n"
        "}\n\n"
        "CRITICAL: If you do not have a specific value, return an empty string or empty list, NEVER return '[object Object]'."
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

    # ── 4. Model Callers ──────────────────────────────────────────────────────
    async def _call_ollama(url: str, timeout_seconds: int, model_name: str) -> str:
        logger.info(f"reasoning_agent_node: calling Ollama/{model_name} at {url}")
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            # Use /api/generate
            prompt = f"System: {system_prompt}\n\nUser Context: {user_prompt}\n\nAssistant Response (JSON ONLY):"
            payload = {
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_ctx": 4096,
                    "temperature": 0.1,
                    "num_predict": NODE_TOKEN_LIMITS["reasoning"]
                },
            }
            response = await client.post(f"{url}/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
            return str(data.get("response", ""))

    async def _call_gemini(system: str, user: str) -> str:
        if not settings.gemini_api_key:
            raise ValueError("Gemini API key not configured")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": user}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": NODE_TOKEN_LIMITS["reasoning"],
                "responseMimeType": "application/json"
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"reasoning_agent_node: calling Gemini ({settings.gemini_model})")
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                logger.error(f"Gemini response parsing failed: {data}")
                raise ValueError("Invalid Gemini response format")

    # ── 5. JSON parsing helpers ───────────────────────────────────────────────
    # (parsing logic stays same)
    def _normalize_reasoning(content: str, used_label: str, status: str) -> dict[str, Any]:
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
            if not outcome and "Approved" in str(parsed): outcome = "Approved"
            if not outcome and "Rejected" in str(parsed): outcome = "Rejected"
            if not outcome: outcome = "Approved"
            
            # Check for hallucinations even in parsed data
            raw_reasoning = parsed.get("reasoning", "")
            raw_draft = parsed.get("draft_judgment", content)
            
            # Case-insensitive check
            if "[object object]" in str(raw_reasoning).lower() or "[object object]" in str(raw_draft).lower():
                logger.warning(f"Detection of [object Object] in {used_label} output. Triggering retry/fallback.")
                raise ValueError("Hallucination detected")

            result = {
                "outcome":        outcome,
                "reasoning":      _cleanse_text(raw_reasoning) or "Analysis complete. See draft for details.",
                "cited_laws":     parsed.get("cited_laws", []) if isinstance(parsed.get("cited_laws"), list) else [],
                "cited_cases":    parsed.get("cited_cases", []) if isinstance(parsed.get("cited_cases"), list) else [],
                "confidence":     (lambda c: c/100.0 if c > 1.0 else c)(float(str(parsed.get("confidence", 0.85)).replace("%","") or 0.85)),
                "draft_judgment": _cleanse_text(raw_draft),
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

    # ── 6. Execution: Gemini (Primary) → Qwen-1.5B (Fallback) ──────────────────
    
    # Try Gemini first
    if settings.gemini_api_key:
        try:
            content = await _call_gemini(system_prompt, user_prompt)
            return _normalize_reasoning(content, f"gemini:{settings.gemini_model}", "ok")
        except Exception as e:
            logger.error(f"Gemini reasoning failed: {repr(e)}. Falling back to local Qwen.")

    # Fallback to Qwen via Ollama
    fallback_model = "qwen2.5:1.5b-instruct"
    try:
        content = await _call_ollama(settings.ollama_url, 120, fallback_model)
        return _normalize_reasoning(content, fallback_model, "fallback_ok")
    except Exception as e:
        return _error_result(state, start_time, complexity_score, repr(e))


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
        if not item: return None
        
        # If it's a dict, extract fields
        if isinstance(item, dict):
            # Cleanse input fields from potential LLM artifacts
            raw_title = item.get("law_name") or item.get("title") or item.get("article_number") or "Legal Article"
            raw_content = item.get("content") or item.get("text") or item.get("summary") or "Citation mapped from analysis."
            
            title = _cleanse_text(raw_title)
            content = _cleanse_text(raw_content)
        else:
            # It's a string
            title = str(item)
            content = "Citations mapped from primary case analysis."
            
        # Case-insensitive filter
        if _is_hallucination(title) or _is_hallucination(content):
            return None
            
        # Truncate content to first 2 sentences max
        sentences = content.split('. ')
        short_content = '. '.join(sentences[:2]).strip()
        if short_content and not short_content.endswith('.'):
            short_content += '.'
            
        return {"title": title, "content": short_content or content}

    raw_laws = reasoning.get("cited_laws") or state.get("laws", [])
    # Filter out Nones from the list comprehension
    law_articles = [obj for l in raw_laws if (obj := _to_article_obj(l)) is not None]

    explainability = {
        "law_articles": law_articles,
        "laws": law_articles, # Duplicate for frontend compatibility
        "similar_precedents": reasoning.get("cited_cases") or state.get("precedents", []),
        "similarPrecedents": reasoning.get("cited_cases") or state.get("precedents", []), # Frontend compatibility
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
    raw_draft = reasoning.get("draft_judgment") or ""
    draft_content = _cleanse_text(raw_draft)
    
    if not draft_content or _is_hallucination(draft_content):
        draft_content = _cleanse_text(reasoning.get("reasoning", "No reasoning provided."))

    def _to_str(item):
        if isinstance(item, dict):
            # Check most common keys for laws and precedents
            return (item.get("title") or item.get("case_name") or 
                    item.get("law_name") or item.get("article_number") or str(item))
        return str(item)

    # Deduplicate and Filter Citations
    raw_laws = reasoning.get("cited_laws", [])
    if not raw_laws:
        raw_laws = state.get("laws", [])
        
    raw_cases = reasoning.get("cited_cases", [])
    if not raw_cases:
        raw_cases = state.get("precedents", [])

    # Filter out hallucinations and deduplicate by string representation
    unique_laws = []
    seen_laws = set()
    for l in raw_laws:
        s = _to_str(l)
        if s and not _is_hallucination(s) and s not in seen_laws:
            unique_laws.append(s)
            seen_laws.add(s)

    unique_cases = []
    seen_cases = set()
    for c in raw_cases:
        s = _to_str(c)
        if s and not _is_hallucination(s) and s not in seen_cases:
            unique_cases.append(s)
            seen_cases.add(s)

    # Build HTML sections
    law_items = "".join([f"<li>{l}</li>" for l in unique_laws]) or "<li>No specific articles cited.</li>"
    case_items = "".join([f"<li>{c}</li>" for c in unique_cases]) or "<li>No specific precedents cited.</li>"

    final_draft = (
        f"<div style='font-family: serif; color: #1a1a1a;'>"
        f"<div style='text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px;'>"
        f"<h2 style='margin: 0; font-size: 18px;'>DIFC COURTS - SMALL CLAIMS TRIBUNAL</h2>"
        f"<p style='margin: 5px 0; font-size: 14px;'>CASE ID: {state['case_id']}</p>"
        f"<h3 style='margin: 10px 0; color: #b45309;'>AI-ASSISTED JUDGMENT DRAFT</h3>"
        f"</div>"
        
        f"<h3>1. DISPOSITION AND OUTCOME</h3>"
        f"<p><strong>The Tribunal's decision is:</strong> {reasoning.get('outcome') or 'PENDING'}</p>"
        
        f"<h3>2. LEGAL REASONING</h3>"
        f"<div style='line-height: 1.6; white-space: pre-wrap;'>{draft_content}</div>"
        
        f"<h3>3. CITED AUTHORITIES</h3>"
        f"<h4>Statutory Provisions:</h4>"
        f"<ul>{law_items}</ul>"
        f"<h4>Judicial Precedents:</h4>"
        f"<ul>{case_items}</ul>"
        
        f"<div style='margin-top: 30px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 12px; color: #666; text-align: center;'>"
        f"--- End of AI Draft ---"
        f"</div>"
        f"</div>"
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
