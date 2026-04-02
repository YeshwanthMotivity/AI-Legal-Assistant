import json
import logging
import time
import re
from datetime import datetime
import difflib
from typing import Any
import uuid
import os

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

def _smart_slice(text: str, target_len: int = 1500) -> str:
    if len(text) <= target_len:
        return text
    markers = [
        text.lower().find("claimant:"),
        text.lower().find("respondent:"),
        text.lower().find(" v "),
        text.lower().find("between"),
    ]
    first_hit = min((m for m in markers if m >= 0), default=0)
    start = max(0, first_hit - 200)
    end = start + target_len
    if end > len(text):
        end = len(text)
        start = max(0, end - target_len)
    return text[start:end]

NOISE_PATTERNS = [
    r"https?://\S+",
    r"\(/[\w-]+\)",
    r"DFSA\s*\(",
    r"Dubai Courts",
    r"data-protection-policy",
    r"terms-of-use",
    r"quality-policy",
    r"disclaimer",
    r"Legal Database",
]

def _strip_noise(text: str) -> str:
    for pattern in NOISE_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
    
# ─────────────────────────────────────────────────────────────────────────────
# 0. Global Setup: Law Display Normalization
# ─────────────────────────────────────────────────────────────────────────────

CATEGORY_DISPLAY_NAMES = {
    "DIFC_Employment_Law":   "DIFC Employment Law (No. 2 of 2019)",
    "employment_law":        "DIFC Employment Law",
    "contract_law":         "DIFC Contract Law",
    "companies_law":        "DIFC Companies Law",
    "Federal_Labour_Law":    "UAE Federal Labour Law (Decree No. 33 of 2021)",
    "ADGM_Employment_Law":   "ADGM Employment Regulations 2019",
}

def _resolve_law_title(l: dict) -> str:
    raw_case_title = str(l.get("case_title") or "")
    category = str(l.get("category") or "")
    raw_name = str(l.get("law_name") or "")
    
    # Priority 1: Proper Case Title (if it's not a generic slug/filename)
    if (raw_case_title and raw_case_title != raw_name and 
        len(raw_case_title) > 10 and not raw_case_title.startswith("ADGM1547") and
        'Article X' not in raw_case_title):
        return raw_case_title
        
    # Priority 2: Category Map
    if category in CATEGORY_DISPLAY_NAMES:
        return CATEGORY_DISPLAY_NAMES[category]
        
    # Priority 3: Formatted Law Name
    return raw_name.replace("-", " ").replace("_", " ").title()

def _extract_article_title(raw_text: str, category: str) -> str:
    # Search entire chunk for "Article N" pattern
    match = re.search(r'\b(Article\s+\d+[\w()]*(?:\s*[-–:]\s*[\w\s]{3,50})?)', raw_text)
    if match:
        found = match.group(1).strip()
        # Validate it's a real article reference, not noise
        if len(found) > 8 and not found.endswith('('):
            return found
    # Fall back to category display name
    return CATEGORY_DISPLAY_NAMES.get(category, 
           category.replace("_", " ").replace("-", " ").title())

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
        
        # Deduplicate precedents by case_id AND title keeping highest score
        seen_case_ids = set()
        seen_titles = set()
        deduped_candidates = []
        for c in candidates:
            payload = c.payload if hasattr(c, "payload") else c.get("payload", {})
            cid = payload.get("case_id", "")
            title = payload.get("case_name") or payload.get("title") or "Unknown Case"
            
            is_dup_id = bool(cid and cid in seen_case_ids)
            is_dup_title = bool(title != "Unknown Case" and title in seen_titles)
            
            if is_dup_id or is_dup_title:
                continue
                
            if cid:
                seen_case_ids.add(cid)
            if title != "Unknown Case":
                seen_titles.add(title)
                
            deduped_candidates.append(c)
        
        results = []
        for c in deduped_candidates:
            payload = c.payload if hasattr(c, "payload") else c.get("payload", {})
            score = c.score if hasattr(c, "score") else c.get("score", 0.0)
            
            if score > 0.6:
                results.append({
                    "id": str(c.id) if hasattr(c, "id") else str(uuid.uuid4()), # Point ID
                    "case_id": payload.get("case_id", ""),                    # Payload ID
                    "title": payload.get("case_name") or payload.get("title") or "Unknown Case",
                    "year": payload.get("year", "N/A"),
                    "category": payload.get("category", "Unspecified"),
                    "text": payload.get("raw_text", "")[:2000],
                    "score": score
                })
        async with httpx.AsyncClient(timeout=30) as client:
            for item in results[:5]:
                parsed = None
                try:
                    # Primary: Groq (only if key present)
                    if settings.groq_api_key:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"},
                            json={
                                "model": settings.groq_model,
                                "response_format": {"type": "json_object"},
                                "messages": [
                                    {"role": "system", "content": (
                                        f"You are a DIFC legal case parser. Extract from the court text and return ONLY valid JSON — no markdown, no explanation.\n"
                                        f"Schema: {{\"case_name\": \"X v Y or null\", \"claimant\": \"name or null\", "
                                        f"\"respondent\": \"name or null\", \"year\": \"4-digit string or null\", "
                                        f"\"outcome\": \"Awarded|Dismissed|Partial|Settled|null\", "
                                        f"\"summary\": \"1-2 sentence factual summary\"}}\n"
                                        f"{'CRITICAL: Translate the summary and outcome into Arabic.' if state.get('ui_language') == 'ar' else ''}"
                                    )},
                                    {"role": "user", "content": _smart_slice(item["text"], 3000)}
                                ],
                                "max_tokens": 200,
                                "temperature": 0.0,
                            }
                        )
                        if resp.status_code == 200:
                            parsed = resp.json()
                            logger.info(f"Groq parsing successful for {item['title']}")
                except Exception as e:
                    logger.warning(f"Groq call failed for {item['title']}: {e}")

                try:
                    # Fallback: Gemini
                    if not parsed and settings.gemini_api_key:
                        resp = await client.post(
                            f"https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions",
                            params={"key": settings.gemini_api_key},
                            headers={"Content-Type": "application/json"},
                            json={
                                "model": "gemini-2.0-flash",
                                "response_format": {"type": "json_object"},
                                "messages": [
                                    {"role": "system", "content": (
                                        f"You are a DIFC legal case parser. Extract from the court text and return ONLY valid JSON.\n"
                                        f"Schema: {{\"case_name\": \"X v Y or null\", \"claimant\": \"name or null\", "
                                        f"\"respondent\": \"name or null\", \"year\": \"4-digit string or null\", "
                                        f"\"outcome\": \"Awarded|Dismissed|Partial|Settled|null\", "
                                        f"\"summary\": \"1-2 sentence factual summary\"}}\n"
                                        f"{'CRITICAL: Translate the summary and outcome into Arabic.' if state.get('ui_language') == 'ar' else ''}"
                                    )},
                                    {"role": "user", "content": _smart_slice(item["text"], 3000)}
                                ],
                                "max_tokens": 200,
                                "temperature": 0.0,
                            }
                        )
                        if resp.status_code == 200:
                            parsed = resp.json()
                            logger.info(f"Gemini parsing successful for {item['title']}")
                except Exception as e:
                    logger.warning(f"Gemini call failed for {item['title']}: {e}")

                if parsed:
                    try:
                        content = parsed["choices"][0]["message"]["content"]
                        if isinstance(content, str):
                            data = json.loads(content)
                        else:
                            data = content
                        
                        if data.get("case_name"):
                            item["title"] = data["case_name"]
                        
                        # Validate party names — reject generic labels and cited-case prefixes
                        _BAD_PARTY = {None, "", "the Claimant", "Claimant", "claimant",
                                      "the Defendant", "Defendant", "defendant",
                                      "the Respondent", "Respondent", "See transcript", "N/A"}
                        _BAD_PREFIX = ("In ", "See ", "As in ", "Cited in", "Relying on",
                                       "Although ", "Those ", "Court of Appeal in ",
                                       "Justice ", "Lady ", "Lord ")
                        
                        raw_claimant = data.get("claimant")
                        raw_respondent = data.get("respondent")
                        
                        if raw_claimant and raw_claimant not in _BAD_PARTY and not raw_claimant.startswith(_BAD_PREFIX):
                            item["claimant"] = raw_claimant
                        else:
                            item["claimant"] = None
                        
                        if raw_respondent and raw_respondent not in _BAD_PARTY and not raw_respondent.startswith(_BAD_PREFIX):
                            item["respondent"] = raw_respondent
                        else:
                            item["respondent"] = None
                        
                        item["outcome"]    = data.get("outcome") or item.get("outcome", "")
                        item["year"]       = data.get("year") or item.get("year", "N/A")
                        item["summary"]    = data.get("summary", "")
                        item["text"]       = data.get("summary", item["text"])
                    except Exception:
                        pass
                    
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
        
        must = []
        must_not = []
        if state.get("query_language"):
            must.append(FieldCondition(key="language", match=MatchValue(value=state["query_language"])))
            
        qt = str(state.get("query_text", "")).lower()
        if "adgm" not in qt and "federal" not in qt:
            must_not.append(FieldCondition(key="category", match=MatchValue(value="ADGM_Employment_Law")))
            must_not.append(FieldCondition(key="category", match=MatchValue(value="Federal_Labour_Law")))
            
        qfilter = Filter(must=must, must_not=must_not) if (must or must_not) else None
        result = await client.query_points(
            collection_name="difc_laws",
            query=query_embedding,
            query_filter=qfilter,
            limit=10,
            with_payload=True,
        )
        points = result.points if hasattr(result, "points") else (
            result.get("points", []) if isinstance(result, dict) else result
        )

        if not points and must:
            logger.info(f"--- Node: law_search_node found 0 results for language '{state['query_language']}', trying without language filter")
            qfilter_fallback = Filter(must_not=must_not) if must_not else None
            result = await client.query_points(
                collection_name="difc_laws",
                query=query_embedding,
                query_filter=qfilter_fallback,
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
            
            raw_law_name = str(payload.get("law_name") or "")
            raw_case_title = str(payload.get("case_title") or "")
            category = str(payload.get("category") or "")

            # Use resolved title and extract article
            base_title = _resolve_law_title(payload)
            content = str(payload.get("raw_text") or payload.get("text") or "")
            title = _extract_article_title(content, category)
            
            # If the extracted title is just the category, prepend the base title for context
            if title == CATEGORY_DISPLAY_NAMES.get(category):
                title = f"{base_title} - {title}"

            # Hallucination filter at search level
            if _is_hallucination(title) or _is_hallucination(content):
                continue

            if score > 0.6:
                results.append({
                    "title": title,
                    "content": content,
                    "score": score
                })
        async with httpx.AsyncClient(timeout=30) as client:
            for item in results[:5]:
                item["content"] = _strip_noise(item["content"])
                parsed = None
                try:
                    # Primary: Groq (only if key present)
                    if settings.groq_api_key:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"},
                            json={
                                "model": settings.groq_model,
                                "response_format": {"type": "json_object"},
                                "messages": [
                                    {"role": "system", "content": (
                                        f"You are a DIFC legal article parser. Return ONLY valid JSON — no markdown, no explanation.\n"
                                        f"Schema: {{\"article_number\": \"e.g. Article 19(2) or null\", \"article_title\": \"short title or null\", "
                                        f"\"law_name\": \"full law name\", \"summary\": \"1-2 sentence plain English explanation\"}}\n"
                                        f"{'CRITICAL: Translate the summary, article title and law name into Arabic.' if state.get('ui_language') == 'ar' else ''}"
                                    )},
                                    {"role": "user", "content": item["content"][:1500]}
                                ],
                                "max_tokens": 120,
                                "temperature": 0.0,
                            }
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            content = data["choices"][0]["message"]["content"]
                            parsed = json.loads(content) if isinstance(content, str) else content
                            logger.info(f"Groq law parsing successful for {item['title']}")
                except Exception as e:
                    logger.warning(f"Groq law parsing call failed: {e}")

                try:
                    # Fallback: Gemini
                    if not parsed and settings.gemini_api_key:
                        resp = await client.post(
                            f"https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions",
                            params={"key": settings.gemini_api_key},
                            headers={"Content-Type": "application/json"},
                            json={
                                "model": "gemini-2.0-flash",
                                "response_format": {"type": "json_object"},
                                "messages": [
                                    {"role": "system", "content": (
                                        f"You are a DIFC legal article parser. Return ONLY valid JSON.\n"
                                        f"Schema: {{\"article_number\": \"e.g. Article 19(2) or null\", \"article_title\": \"short title or null\", "
                                        f"\"law_name\": \"full law name\", \"summary\": \"1-2 sentence plain English explanation\"}}\n"
                                        f"{'CRITICAL: Translate the summary, article title and law name into Arabic.' if state.get('ui_language') == 'ar' else ''}"
                                    )},
                                    {"role": "user", "content": item["content"][:1500]}
                                ],
                                "max_tokens": 120,
                                "temperature": 0.0,
                            }
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            content = data["choices"][0]["message"]["content"]
                            parsed = json.loads(content) if isinstance(content, str) else content
                            logger.info(f"Gemini law parsing successful for {item['title']}")
                except Exception as e:
                    logger.warning(f"Gemini law parsing fallback failed: {e}")

                if parsed:
                    item["article_number"] = parsed.get("article_number")
                    item["article_title"]  = parsed.get("article_title")
                    item["law_name"]       = parsed.get("law_name") or item.get("title", "")
                    item["content"]        = parsed.get("summary", item["content"])
                    if parsed.get("article_number"):
                        item["title"] = parsed["article_number"]

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
        "case_type": safe_val(case.case_type.value if case and hasattr(case.case_type, "value") else (case.case_type if case else "")),
        "filing_date": safe_val(case.filing_date.strftime("%d-%m-%Y") if case and getattr(case, "filing_date", None) else ""),
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
        statute_title = l.get('title') or _resolve_law_title(l)
        
        # Check if articles are real or placeholder
        key_arts = l.get('key_articles', '')
        art_hint = ""
        if key_arts and 'Article X' not in str(key_arts):
            art_hint = f" | Key Articles: {key_arts}"
            
        laws.append(
            f"Statute: {statute_title}{art_hint} | Match: {l.get('score', 0):.2f}\n"
            f"{l.get('content') or l.get('text')}"
        )
        
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
        
    cleaned = raw.strip()
    if cleaned.lower().startswith('json'):
        cleaned = cleaned[4:].strip()
    raw = cleaned

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
    
    # Strip emojis from judgment drafts
    text = re.sub(r'[\U0001F300-\U0001FFFF\U00002700-\U000027BF🔹🧾📌]', '', str(text)).strip()
    
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
    lang = state.get("query_language", "en")
    
    if lang == "ar":
        model_label = "jwnder/jais-adaptive:7b"
    else:
        model_label = "qwen2.5:1.5b-instruct"
        
    model_url = f"{settings.ollama_url}/api/generate"
    complexity_score = 0.5
        
    return model_url, model_label, complexity_score


async def _call_ollama(model_url: str, model_name: str, system: str, user: str, token_limit: int) -> str:
    """Generic Ollama /api/generate caller."""
    payload = {
        "model": model_name,
        "prompt": f"System: {system}\n\nUser Context: {user}\n\nAssistant Response (JSON ONLY):",
        "stream": False,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.1,
            "num_predict": token_limit
        },
    }
    
    async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
        resp = await client.post(model_url, json=payload)
        if resp.status_code != 200:
            logger.error(f"Ollama API Error {resp.status_code}: {resp.text}")
            resp.raise_for_status()
        
        data = resp.json()
        return str(data.get("response", ""))


async def reasoning_agent_node(state: AnalysisState) -> dict[str, Any]:
    start_time = time.time()
    logger.info(f"--- Node: reasoning_agent_node starting for case {state['case_id']}")

    # ── 1. Route to the right model ──────────────────────────────────────────
    model_url, model_label, complexity_score = _select_model(state)

    # ── 2. Prompts ───────────────────────────────────────────────────────────
    system_prompt = (
        "You are a Chief Legal Officer for DIFC UAE Labor Law. Provide a precise, professional legal analysis in JSON format.\n"
        f"Language: {state.get('ui_language', 'en')}.\n\n"
        "RESPONSE SCHEMA (STRICT):\n"
        "{\n"
        "  \"outcome\": \"Approved\" | \"Rejected\" | \"Partial\",\n"
        "  \"summary\": \"Case Metadata and Parties summary using EXACT Markdown requested (e.g. 📌 Case Metadata...)\",\n"
        "  \"facts\": [\"String array of Key Facts and Court Analysis formatted cleanly with emojis (e.g. Issue 1:, 📌 Final Decision)\"],\n"
        "  \"reasoning\": \"Step-by-step legal justification. USE PLAIN TEXT ONLY. NO JSON OR OBJECTS INSIDE.\",\n"
        "  \"cited_laws\": [\"Exact name/Article number of applicable UAE/DIFC Laws\"],\n"
        "  \"cited_cases\": [\"Case References or Precedents\"],\n"
        "  \"confidence\": 0.0 to 1.0,\n"
        "  \"draft_judgment\": \"Write a COURT RULING document using the case facts. NEVER copy law metadata. Use this format EXACTLY:\\n"
        f"{'محاكم مركز دبي المالي العالمي - المحكمة' if state.get('ui_language') == 'ar' else 'DIFC COURTS - TRIBUNAL'}\\n"
        f"{'المرجع:' if state.get('ui_language') == 'ar' else 'CASE REFERENCE:'} [case_id]\\n"
        f"{'المدعي:' if state.get('ui_language') == 'ar' else 'CLAIMANT:'} [claimant name]\\n"
        f"{'المدعى عليه:' if state.get('ui_language') == 'ar' else 'RESPONDENT:'} [respondent name]\\n\\n"
        f"{'🧾 ملخص الحكم' if state.get('ui_language') == 'ar' else '🧾 JUDGMENT SUMMARY'}\\n"
        f"{'نظرت هذه المحكمة في دعوى [المدعي] ضد [المدعى عليه] بشأن [نوع القضية].' if state.get('ui_language') == 'ar' else 'This Tribunal has considered the claim of [claimant] against [respondent] regarding [case type].'}\\n\\n"
        f"{'🔹 النتائج الواقعية' if state.get('ui_language') == 'ar' else '🔹 FINDINGS OF FACT'}\\n"
        "1. [Finding from case evidence]\\n"
        "2. [Finding from case evidence]\\n\\n"
        f"{'🔹 التحليل القانوني' if state.get('ui_language') == 'ar' else '🔹 LEGAL ANALYSIS'}\\n"
        "[How the cited articles apply to the specific facts]\\n\\n"
        f"{'🔹 القرار والأوامر' if state.get('ui_language') == 'ar' else '🔹 DECISION & ORDERS'}\\n"
        "The Tribunal ORDERS: [specific remedy or dismissal with amounts if applicable]\\n\\n"
        f"{'🔹 السند القانوني' if state.get('ui_language') == 'ar' else '🔹 LEGAL BASIS'}\\n"
        "[Exact article citations that ground this decision]\"\n"
        "}\n\n"
        f"{'CRITICAL: draft_judgment must be a COURT RULING about the specific parties and facts. YOU MUST WRITE THE DRAFT IN ARABIC AND TRANSLATE ALL CONTENT TO ARABIC. NEVER return [object Object].' if state.get('ui_language') == 'ar' else 'CRITICAL: draft_judgment must be a COURT RULING about the specific parties and facts — NEVER a copy of law text or metadata. NEVER return [object Object].'}"
    )
    ctx = state.get("context", {})
    meta = ctx.get("case_metadata", {})
    # Send a trimmed context so 1.5b model can handle it
    trimmed_context = {
        "case_id": state["case_id"],
        "claimant": meta.get("claimant", ""),
        "respondent": meta.get("respondent", ""),
        "case_type": meta.get("case_type", ""),
        "description": str(meta.get("description", ""))[:500],
        "similar_precedents": ctx.get("legal_authority", {}).get("similar_precedents", [])[:2],
        "statutes": [
            str(s)[:400] for s in ctx.get("legal_authority", {}).get("relevant_statutes", [])[:3]
        ] if isinstance(ctx.get("legal_authority", {}).get("relevant_statutes", []), list) else [],
        "document_fragments": ctx.get("document_evidence_fragments", [])[:2],
    }
    user_prompt = json.dumps(trimmed_context, ensure_ascii=False)

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

    # ── 4. Groq API Caller ────────────────────────────────────────────────────
    async def _call_groq(timeout_seconds: int, model_name: str) -> str:
        logger.info(f"reasoning_agent_node: calling groq ({model_name})")
        
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False,
            "temperature": 0.1,
            "max_tokens": NODE_TOKEN_LIMITS["reasoning"]
        }
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.groq_api_key1}"
            }
            response = await client.post(model_url, headers=headers, json=payload, timeout=timeout_seconds)
            
            if response.status_code != 200:
                logger.error(f"Groq API Error {response.status_code}: {response.text}")
                response.raise_for_status()
                
            data = response.json()
            return str(data.get("choices", [{}])[0].get("message", {}).get("content", ""))


    # ── 5. JSON parsing helpers ───────────────────────────────────────────────
    # (parsing logic stays same)
    def _normalize_reasoning(content: str, used_label: str, status: str) -> dict[str, Any]:
        parsed = _extract_json_object(content)
        if not parsed:
            if content and len(content) > 50:
                logger.warning(f"{used_label} returned non-JSON, attempting manual field extraction.")
                
                # Try to manually extract fields using regex as last resort
                def _extract_field(text: str, key: str) -> str:
                    pattern = rf'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)"'
                    match = re.search(pattern, text)
                    return match.group(1) if match else ""
                
                def _extract_list_field(text: str, key: str) -> list:
                    pattern = rf'"{key}"\s*:\s*\[(.*?)\]'
                    match = re.search(pattern, text, re.DOTALL)
                    if not match:
                        return []
                    items_str = match.group(1)
                    items = re.findall(r'"((?:[^"\\]|\\.)*)"', items_str)
                    return items
                
                result = {
                    "outcome":        _extract_field(content, "outcome") or "Approved",
                    "summary":        _extract_field(content, "summary") or "",
                    "facts":          _extract_list_field(content, "facts"),
                    "reasoning":      _extract_field(content, "reasoning") or "Analysis complete. See draft for details.",
                    "cited_laws":     _extract_list_field(content, "cited_laws"),
                    "cited_cases":    _extract_list_field(content, "cited_cases"),
                    "confidence":     0.5,
                    "draft_judgment": _extract_field(content, "draft_judgment") or "",
                }
                
                # If we still couldn't get a summary, don't show raw JSON
                if not result["summary"] and not result["facts"]:
                    result["reasoning"] = "Analysis complete. See draft for details."
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
                "summary":        _cleanse_text(parsed.get("summary", "")),
                "facts":          [_cleanse_text(f) for f in parsed.get("facts", [])] if isinstance(parsed.get("facts"), list) else [],
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
        law_articles = [l for l in state.get("laws", []) if l.get("law_name") or l.get("category") or l.get("content")]
        
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

    # Execute Ollama
    try:
        content = await _call_ollama(
            model_url, 
            model_label, 
            system_prompt, 
            user_prompt, 
            NODE_TOKEN_LIMITS["reasoning"]
        )
        return _normalize_reasoning(content, model_label, "ok")
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
    def _to_precedent_obj(item):
        if not item: return None
        if isinstance(item, dict):
            return {
                "caseId": item.get("case_id") or item.get("id"),
                "title": item.get("case_name") or item.get("title") or "Unknown Case",
                "similarityScore": item.get("score") or item.get("similarity_score") or 1.0
            }
        return {
            "caseId": None,
            "title": str(item),
            "similarityScore": 1.0
        }
            
        # Case-insensitive filter
        return {"title": title, "content": short_content}

    def _to_article_obj(item):
        if not item: return None
        if isinstance(item, dict):
            raw_title = _resolve_law_title(item)
            raw_content = item.get("content") or item.get("text") or item.get("summary") or "Citation mapped from analysis."
            title, content = _cleanse_text(raw_title), _cleanse_text(raw_content)
        else:
            title, content = str(item), "Citations mapped from primary case analysis."
        if _is_hallucination(title) or _is_hallucination(content): return None
        short_content = content[:400] + "..." if len(content) > 400 else content
        return {"title": title, "content": short_content}

    raw_laws = reasoning.get("cited_laws") or state.get("laws", [])
    # Filter out Nones from the list comprehension
    law_articles = [obj for l in raw_laws if (obj := _to_article_obj(l)) is not None]

    raw_precedents = reasoning.get("cited_cases") or state.get("precedents", [])
    similar_precedents = [obj for p in raw_precedents if (obj := _to_precedent_obj(p)) is not None]

    explainability = {
        "summary": reasoning.get("summary", ""),
        "facts": reasoning.get("facts", []),
        "law_articles": law_articles,
        "laws": law_articles,
        "similar_precedents": similar_precedents,
        "similarPrecedents": similar_precedents,
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
    context = state.get("context", {})
    meta = context.get("case_metadata", {})

    claimant = meta.get("claimant", "Claimant")
    respondent = meta.get("respondent", "Respondent")
    case_type = meta.get("case_type", "Employment Dispute")
    case_id = state["case_id"]
    outcome = reasoning.get("outcome", "Approved")
    cited_laws = reasoning.get("cited_laws", [])
    cited_cases = reasoning.get("cited_cases", [])
    facts_summary = " ".join(reasoning.get("facts", []))[:800]
    reasoning_text = str(reasoning.get("reasoning", ""))[:600]

    system_prompt = (
        "You are a DIFC Court Judge writing an official judgment. "
        "Write ONLY the court ruling document. Do NOT copy law text or document metadata. "
        "Use the case facts and legal reasoning provided to write the judgment.\n\n"
        "OUTPUT FORMAT (use exactly):\n"
        "DIFC COURTS - TRIBUNAL\n"
        f"CASE REFERENCE: {case_id}\n"
        f"CLAIMANT: {claimant}\n"
        f"RESPONDENT: {respondent}\n\n"
        "JUDGMENT SUMMARY\n"
        "[One sentence stating what this case is about and the tribunal's decision]\n\n"
        "FINDINGS OF FACT\n"
        "1. [Key finding]\n"
        "2. [Key finding]\n"
        "3. [Key finding]\n\n"
        "LEGAL ANALYSIS\n"
        "[How the cited laws apply to these specific facts]\n\n"
        "DECISION & ORDERS\n"
        "[Specific order — what must be paid or done, or why claim is dismissed]\n\n"
        "LEGAL BASIS\n"
        "[The exact articles that ground this decision]\n\n"
        "Signed: DIFC Small Claims Tribunal\n"
        "--- END OF JUDGMENT ---\n\n"
        f"{'CRITICAL INSTRUCTION: You MUST write the ENTIRE judgment in ARABIC. Do NOT output any English text. Translate all headings, names, and content.' if state.get('ui_language') == 'ar' else 'Write the judgment in English.'}"
    )

    user_prompt = (
        f"Case Type: {case_type}\n"
        f"Outcome: {outcome}\n"
        f"Key Facts: {facts_summary}\n"
        f"Legal Reasoning: {reasoning_text}\n"
        f"Cited Laws: {', '.join(cited_laws[:5])}\n"
        f"Cited Cases: {', '.join(cited_cases[:3])}\n\n"
        "Write the official court judgment now."
    )

    try:
        model_url, model_name, _ = _select_model(state)
        draft_content = await _call_ollama(
            model_url,
            model_name,
            system_prompt,
            user_prompt,
            NODE_TOKEN_LIMITS["drafting"]
        )
        draft_content = _cleanse_text(draft_content)
    except Exception as e:
        logger.warning(f"judgment_drafting_agent_node failed: {e}, using reasoning fallback")
        draft_content = reasoning.get("draft_judgment") or reasoning.get("reasoning") or ""

    final_draft = (
        f"<div style='font-family: inherit; color: #1a1a1a;'>"
        f"<div style='text-align: center; border-bottom: 2px dashed #cecece; margin-bottom: 24px; padding-bottom: 16px;'>"
        f"<h2 style='margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 0.5px;'>{'محاكم مركز دبي المالي العالمي - المحكمة' if state.get('ui_language') == 'ar' else 'DIFC COURTS - TRIBUNAL'}</h2>"
        f"<p style='margin: 5px 0; font-size: 12px; color: #666;'>{'المرجع:' if state.get('ui_language') == 'ar' else 'CASE REFERENCE:'} {state['case_id']}</p>"
        f"</div>"
        
        f"<div style='line-height: 1.7; white-space: pre-wrap; font-size: 15px;'>"
        f"{draft_content}"
        f"</div>"
        f"</div>"
    )

    from app.modules.ingestion.minio_client import upload_file
    payload_bytes = final_draft.encode("utf-8")
    try:
        await upload_file(
            bucket="judgment-drafts",
            key=f"{state['case_id']}/draft.txt",
            data=payload_bytes,
            length=len(payload_bytes),
            content_type="text/plain; charset=utf-8",
        )
    except Exception:
        pass

    duration = time.time() - start_time
    logger.info(f"--- Node: judgment_drafting_agent_node finished in {duration:.2f}s")
    return {"draft_judgment": final_draft, "draft_text": final_draft}
