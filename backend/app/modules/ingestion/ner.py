"""
ner.py — Fixed version
Changes from original:
  - LLM timeout changed from 2.0 → 60.0 seconds
  - Added Arabic entity extraction patterns to regex fallback
  - Improved JSON cleaning to handle more LLM response formats
"""

import json
import logging
import re
from typing import Set

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    return match.group(1).strip() if match else None


def _regex_extract(text: str) -> list[dict]:
    """
    Regex-based entity extraction.
    Handles both English and Arabic legal document patterns.
    """
    entities: list[dict] = []
    seen_entity_values: Set[str] = set()

    # ── English patterns ─────────────────────────────────────────────────────
    employee = _first_match(
        r"(?:Employee|Claimant)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{2,})", text
    )
    employer = _first_match(
        r"(?:Employer|Company|Respondent)\s*[:\-]\s*"
        r"([A-Za-z0-9][A-Za-z0-9 .,&'-]{2,})",
        text
    )
    salary = _first_match(
        r"(?:Salary|Monthly Salary)\s*[:\-]\s*"
        r"([A-Z]{0,3}\s?[\d,]+(?:\.\d{1,2})?)",
        text
    )
    start = _first_match(
        r"(?:Employment Start|Start Date|Date of Joining|employed.*?from)\s*"
        r"[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})",
        text
    )
    end = _first_match(
        r"(?:Employment End|End Date|Last Working Day|terminated.*?on)\s*"
        r"[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})",
        text
    )
    reason = _first_match(
        r"(?:Termination Reason|Reason for Termination)\s*[:\-]\s*(.+)", text
    )

    # ── Arabic patterns ──────────────────────────────────────────────────────
    # Employee name in Arabic docs (المدعي = Claimant)
    if not employee:
        employee = _first_match(
            r"(?:المدعي|الموظف)\s*[:/]\s*([^\n\u060C]{3,40})", text
        )

    # Employer in Arabic docs (المدعى عليه = Respondent/Defendant)
    if not employer:
        employer = _first_match(
            r"(?:المدعى عليه|صاحب العمل|الشركة)\s*[:/]\s*([^\n\u060C]{3,60})",
            text
        )

    # Salary in Arabic (الراتب = salary)
    if not salary:
        salary = _first_match(
            r"(?:الراتب|الأجر)\s*[:/]?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:درهم|AED)?",
            text
        )

    if employee:
        entities.append({
            "entity_type": "employee_name",
            "entity_value": employee,
            "confidence_score": 0.78
        })
    if employer:
        entities.append({
            "entity_type": "employer_name",
            "entity_value": employer,
            "confidence_score": 0.78
        })
    if salary:
        entities.append({
            "entity_type": "salary",
            "entity_value": salary,
            "confidence_score": 0.82
        })
    if start:
        entities.append({
            "entity_type": "employment_start",
            "entity_value": start,
            "confidence_score": 0.74
        })
    if end:
        entities.append({
            "entity_type": "employment_end",
            "entity_value": end,
            "confidence_score": 0.74
        })
    if reason:
        entities.append({
            "entity_type": "termination_reason",
            "entity_value": reason,
            "confidence_score": 0.7
        })

    # ── Law article references (English and Arabic) ──────────────────────────
    law_article_pattern = r"(?:Article|Art\.?|المادة)\s*(\d+)"
    law_article_matches = re.findall(law_article_pattern, text, re.IGNORECASE)

    for match in law_article_matches:
        article_value = f"Article {match}"
        if article_value not in seen_entity_values:
            seen_entity_values.add(article_value)
            entities.append({
                "entity_type": "law_article_number",
                "entity_value": article_value,
                "confidence_score": 0.75
            })

    return entities


async def _call_ollama(system: str, user: str, token_limit: int = 512, response_format: str = "json") -> str:
    """Generic Ollama /api/generate caller for ingestion tasks."""
    payload = {
        "model": settings.ollama_model_fallback,
        "prompt": f"System: {system}\n\nUser Context: {user}\n\nAssistant Response:",
        "stream": False,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.1,
            "num_predict": token_limit
        },
    }
    if response_format == "json":
        payload["format"] = "json"
        
    async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
        try:
            resp = await client.post(f"{settings.ollama_url}/api/generate", json=payload)
            if resp.status_code != 200:
                logger.error(f"Ollama API Error {resp.status_code}: {resp.text}")
                return ""
            
            data = resp.json()
            return str(data.get("response", "")).strip()
        except Exception as e:
            logger.error(f"Ollama call failed: {e}")
            return ""


async def extract_entities(text: str) -> list[dict]:
    """
    Extracts named entities using the fallback LLM.
    Falls back to regex extraction if LLM call fails or times out.
    """
    system_prompt = (
        "You are an expert legal entity extractor for UAE Labor Law documents. "
        "Extract the following entities from the court text: "
        "'employee_name', 'employer_name', 'salary', 'employment_start', "
        "'employment_end', 'termination_reason'. "
        "Also extract any cited law articles as a list of strings under "
        "'law_articles'. "
        "Return ONLY valid JSON. No explanation. No markdown."
    )

    try:
        # Exclusive: Local Intelligence (Ollama)
        content = await _call_ollama(
            system=system_prompt,
            user=text[:4000],
            token_limit=1000,
            response_format="json"
        )
        
        if not content:
            raise ValueError("Local Ollama service returned empty content")
            
        logger.info("Local Ollama NER extraction successful")

        # Clean markdown fences
        content = re.sub(r"```json\s*", "", content)
        content = re.sub(r"\s*```", "", content)

        # Extract JSON object if surrounded by text
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            content = json_match.group(0)

        extracted = json.loads(content.strip())

        entities = []
        mapping = {
            "employee_name": "employee_name",
            "employer_name": "employer_name",
            "salary": "salary",
            "employment_start": "employment_start",
            "employment_end": "employment_end",
            "termination_reason": "termination_reason"
        }

        for json_key, db_type in mapping.items():
            val = extracted.get(json_key)
            if (val and isinstance(val, str)
                    and val.lower() not in ("none", "null", "n/a", "")):
                entities.append({
                    "entity_type": db_type,
                    "entity_value": val,
                    "confidence_score": 0.95
                })

        # Law articles list
        articles = extracted.get("law_articles", [])
        if isinstance(articles, list):
            for art in articles:
                if isinstance(art, str) and art.strip():
                    entities.append({
                        "entity_type": "law_article_number",
                        "entity_value": art,
                        "confidence_score": 0.90
                    })

        if entities:
            logger.info(f"LLM NER extracted {len(entities)} entities")
            return entities

    except httpx.TimeoutException:
        logger.warning("LLM NER timed out, falling back to regex")
    except Exception as exc:
        logger.warning(f"LLM NER failed: {exc}, falling back to regex")

    return _regex_extract(text)
