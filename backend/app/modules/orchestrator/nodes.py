import json
from datetime import datetime
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.orchestrator.state import AnalysisState


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


async def search_agent_node(state: AnalysisState) -> dict[str, Any]:
    db: AsyncSession = state["db"]
    entities = state.get("entities", [])
    employee = _first_entity(entities, "employee_name")
    employer = _first_entity(entities, "employer_name")
    termination_reason = _first_entity(entities, "termination_reason")
    query_text = " ".join(part for part in [employee, employer, termination_reason] if part) or f"case {state['case_id']}"

    from app.modules.search.schemas import SearchRequest
    from app.modules.search.services import SearchService

    try:
        response = await SearchService(db).search(
            SearchRequest(query_text=query_text, case_id=state["case_id"], top_k=5)
        )
        search_results = [
            {"chunk_text": item.chunk_text, "score": item.score, "document_id": item.document_id}
            for item in response.results
        ]
    except (httpx.HTTPError, HTTPException, Exception):
        search_results = []
    return {"search_results": search_results}


async def graph_agent_node(state: AnalysisState) -> dict[str, Any]:
    db: AsyncSession = state["db"]
    from app.modules.graph.schemas import GraphQueryIntent
    from app.modules.graph.services import GraphQueryService

    law_articles: list[dict[str, Any]] = []
    related_cases: list[dict[str, Any]] = []
    graph_confidence = 0.0
    service = GraphQueryService(db)
    try:
        laws_response = await service.query(state["case_id"], GraphQueryIntent.FIND_RELEVANT_LAWS)
        cases_response = await service.query(state["case_id"], GraphQueryIntent.FIND_RELATED_CASES)
        law_articles = [item.model_dump() for item in laws_response.law_articles]
        related_cases = [item.model_dump() for item in cases_response.related_cases]
        graph_confidence = max(laws_response.graph_confidence, cases_response.graph_confidence)
    except Exception:
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
    dedup = []
    seen = set()
    for item in state.get("search_results", []):
        text = (item.get("chunk_text") or "").strip()
        if text and text not in seen:
            seen.add(text)
            dedup.append(item)
    context = {
        "entities": state.get("entities", []),
        "search_results": dedup,
        "graph_results": state.get("graph_results", {}),
        "calculation": state.get("calculation", {}),
    }
    return {"context": context}


async def reasoning_agent_node(state: AnalysisState) -> dict[str, Any]:
    system_prompt = (
        "You are a UAE Labor Law judicial assistant. Provide grounded reasoning.\n"
        "Arabic instruction: use only legally grounded, available evidence.\n"
        "Return strict JSON with keys: outcome, reasoning, cited_laws, cited_cases, confidence, draft_judgment."
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
    }

    async def _call(url: str, timeout_seconds: int) -> str:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return str(data["choices"][0]["message"]["content"])

    def _normalize_reasoning(content: str, model_used: str, status: str) -> dict[str, Any]:
        try:
            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                raise ValueError("invalid json shape")
            result = parsed
        except Exception:
            result = {
                "outcome": None,
                "reasoning": content,
                "cited_laws": [],
                "cited_cases": [],
                "confidence": 0.5,
                "draft_judgment": content,
            }
        result["model_used"] = model_used
        return {
            "reasoning": result,
            "model_used": model_used,
            "reasoning_status": status,
        }

    try:
        jais_content = await _call(
            f"{settings.jais_url}/v1/chat/completions",
            settings.jais_timeout_seconds,
        )
        return _normalize_reasoning(jais_content, "jais", "ok")
    except Exception:
        try:
            fallback_content = await _call(
                f"{settings.fallback_model_url}/v1/chat/completions",
                settings.jais_timeout_seconds,
            )
            return _normalize_reasoning(fallback_content, "fallback", "fallback_used")
        except Exception:
            return {
                "reasoning": {
                    "outcome": None,
                    "reasoning": "Reasoning unavailable due to model failures.",
                    "cited_laws": [],
                    "cited_cases": [],
                    "confidence": 0.0,
                    "draft_judgment": "",
                    "model_used": "none",
                },
                "model_used": "none",
                "reasoning_status": "reasoning_unavailable",
                "error": "primary_and_fallback_failed",
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
    draft_text = str(reasoning.get("draft_judgment") or "").strip()
    if not draft_text:
        draft_text = (
            "AI Draft:\n"
            f"Outcome: {reasoning.get('outcome')}\n"
            f"Reasoning: {reasoning.get('reasoning')}\n"
            f"Confidence: {reasoning.get('confidence')}\n"
        )

    from app.modules.ingestion.minio_client import upload_file

    payload = draft_text.encode("utf-8")
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

    return {"draft_text": draft_text}
