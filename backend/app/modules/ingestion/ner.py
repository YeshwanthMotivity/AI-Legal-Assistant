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
    entities: list[dict] = []
    seen_entity_values: Set[str] = set()

    employee = _first_match(r"(?:Employee|Claimant)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{2,})", text)
    employer = _first_match(r"(?:Employer|Company|Respondent)\s*[:\-]\s*([A-Za-z0-9][A-Za-z0-9 .,&'-]{2,})", text)
    salary = _first_match(r"(?:Salary|Monthly Salary)\s*[:\-]\s*([A-Z]{0,3}\s?[\d,]+(?:\.\d{1,2})?)", text)
    start = _first_match(r"(?:Employment Start|Start Date|Date of Joining)\s*[:\-]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", text)
    end = _first_match(r"(?:Employment End|End Date|Last Working Day)\s*[:\-]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", text)
    reason = _first_match(r"(?:Termination Reason|Reason for Termination)\s*[:\-]\s*(.+)", text)

    if employee:
        entities.append({"entity_type": "employee_name", "entity_value": employee, "confidence_score": 0.78})
    if employer:
        entities.append({"entity_type": "employer_name", "entity_value": employer, "confidence_score": 0.78})
    if salary:
        entities.append({"entity_type": "salary", "entity_value": salary, "confidence_score": 0.82})
    if start:
        entities.append({"entity_type": "employment_start", "entity_value": start, "confidence_score": 0.74})
    if end:
        entities.append({"entity_type": "employment_end", "entity_value": end, "confidence_score": 0.74})
    if reason:
        entities.append({"entity_type": "termination_reason", "entity_value": reason, "confidence_score": 0.7})

    # Extract law article references (English and Arabic)
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


async def extract_entities(text: str) -> list[dict]:
    """
    Extracts entities using the JAIS LLM with a structured JSON prompt.
    Falls back to regex extraction if the LLM call fails or times out.
    """
    system_prompt = (
        "You are an expert legal entity extractor. Extract the following entities from the court text: "
        "'employee_name', 'employer_name', 'salary', 'employment_start', 'employment_end', "
        "'termination_reason'. Also extract any cited law articles as a list of strings under 'law_articles'."
        "Return the output as valid JSON. Do not include any explanation."
    )
    
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.post(
                f"{settings.fallback_model_url}/v1/chat/completions",
                json={
                    "model": "fallback",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": text[:4000]}  # avoid token limits
                    ],
                    "temperature": 0.1
                }
            )
            response.raise_for_status()
            data = response.json()
            
        content = data["choices"][0]["message"]["content"]
        
        # Clean up possible markdown fences
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
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
            if val and isinstance(val, str) and val.lower() not in ("none", "null", "n/a"):
                entities.append({
                    "entity_type": db_type,
                    "entity_value": val,
                    "confidence_score": 0.95
                })
                
        # Handle law articles list
        articles = extracted.get("law_articles", [])
        if isinstance(articles, list):
            for art in articles:
                if isinstance(art, str):
                    entities.append({
                        "entity_type": "law_article_number",
                        "entity_value": art,
                        "confidence_score": 0.90
                    })
                    
        if entities:
            return entities
            
    except Exception as exc:
        logger.warning(f"LLM entity extraction failed, falling back to regex: {exc}")
        
    return _regex_extract(text)
