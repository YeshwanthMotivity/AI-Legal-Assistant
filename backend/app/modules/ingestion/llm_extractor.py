"""
llm_extractor.py
Converts cleaned OCR text into structured JSON using Ollama LLMs.
- English docs → qwen2.5:1.5b-instruct (fast)
- Arabic docs  → jwnder/jais-adaptive:7b (accurate)
"""

import json
import logging
import re
import httpx
from app.config import settings

# Removed OLLAMA_BASE_URL (using settings.ollama_url)

logger = logging.getLogger(__name__)

JUDGMENT_SCHEMA = {
    "case_id": "",
    "case_title": "",
    "court": "",
    "judgment_date": "",
    "judge": "",
    "language": "",
    "parties": {"claimant": "", "defendant": ""},
    "claims": [],
    "facts_summary": "",
    "legal_issues": [],
    "decision": "",
    "outcome": "",
    "laws_cited": [],
    "doc_type": "judgment"
}

LAW_SCHEMA = {
    "law_name": "",
    "jurisdiction": "",
    "language": "",
    "summary": "",
    "key_articles": [],
    "doc_type": "law"
}

JUDGMENT_PROMPT_EN = """You are a legal document parser. Extract structured information from this DIFC court judgment.
Return ONLY valid JSON with these exact fields:
{
  "case_id": "e.g. CFI 044/2021",
  "case_title": "Claimant v Defendant",
  "court": "court name",
  "judgment_date": "DD Month YYYY",
  "judge": "Justice Name",
  "language": "en",
  "parties": {"claimant": "name", "defendant": "name"},
  "claims": ["claim 1", "claim 2"],
  "facts_summary": "2-3 sentence summary of key facts",
  "legal_issues": ["issue 1", "issue 2"],
  "decision": "brief outcome statement",
  "outcome": "claimant_wins OR defendant_wins OR partial OR unclear",
  "laws_cited": ["DIFC Law X Article Y"],
  "doc_type": "judgment"
}
Return ONLY the JSON object, no explanation, no markdown.

DOCUMENT TEXT:
"""

JUDGMENT_PROMPT_AR = """أنت محلل وثائق قانونية. استخرج المعلومات المنظمة من حكم محكمة DIFC هذا.
أعد فقط JSON صالح بهذه الحقول:
{
  "case_id": "رقم القضية",
  "case_title": "المدعي ضد المدعى عليه",
  "court": "اسم المحكمة",
  "judgment_date": "التاريخ",
  "judge": "اسم القاضي",
  "language": "ar",
  "parties": {"claimant": "الاسم", "defendant": "الاسم"},
  "claims": ["الادعاء 1", "الادعاء 2"],
  "facts_summary": "ملخص وقائع القضية",
  "legal_issues": ["المسألة القانونية 1"],
  "decision": "ملخص الحكم",
  "outcome": "claimant_wins OR defendant_wins OR partial OR unclear",
  "laws_cited": ["القانون المستشهد به"],
  "doc_type": "judgment"
}
أعد JSON فقط بدون أي شرح.

نص الوثيقة:
"""

LAW_PROMPT_EN = """You are a legal document parser. Extract structured information from this legal text.
Return ONLY valid JSON:
{
  "law_name": "full law name",
  "jurisdiction": "DIFC or ADGM or UAE",
  "language": "en",
  "summary": "2-3 sentence summary of what this law covers",
  "key_articles": ["Article X: brief description"],
  "doc_type": "law"
}
Return ONLY the JSON, no explanation.

DOCUMENT TEXT:
"""

LAW_PROMPT_AR = """أنت محلل وثائق قانونية. استخرج المعلومات المنظمة من هذا النص القانوني.
أعد JSON فقط:
{
  "law_name": "اسم القانون",
  "jurisdiction": "DIFC or ADGM or UAE",
  "language": "ar",
  "summary": "ملخص ما يغطيه هذا القانون",
  "key_articles": ["المادة X: وصف موجز"],
  "doc_type": "law"
}
أعد JSON فقط بدون شرح.

نص الوثيقة:
"""


def _select_model(language: str) -> str:
    """Select model based on language."""
    if language == "ar":
        return settings.ollama_model_primary
    return settings.ollama_model_fallback


def _select_prompt(doc_type: str, language: str) -> str:
    if doc_type == "judgment":
        return JUDGMENT_PROMPT_AR if language == "ar" else JUDGMENT_PROMPT_EN
    return LAW_PROMPT_AR if language == "ar" else LAW_PROMPT_EN


def _parse_json_response(raw: str) -> dict:
    """Extract JSON from LLM response, handle markdown fences."""
    raw = raw.strip()
    # Remove markdown code fences if present
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    logger.warning("LLM returned non-JSON response, using empty structure")
    return {}


async def extract_structure(
    text: str,
    doc_type: str,
    language: str,
    filename: str = ""
) -> dict:
    """
    Call Gemini LLM to extract structured JSON from document text.
    Truncates text to 8000 chars (Gemini handles large context well).
    """
    try:
        prompt = _select_prompt(doc_type, language)
        truncated_text = text[:8000] if len(text) > 8000 else text
        
        model = _select_model(language)
        url = f"{settings.ollama_url}/v1/chat/completions"
        async with httpx.AsyncClient(timeout=120.0) as client:
            headers = {
                "Content-Type": "application/json",
            }
            payload = {
                "model": model,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "user",
                        "content": prompt + truncated_text
                    }
                ],
                "temperature": 0.1,
                "max_tokens": 1024
            }
            response = await client.post(
                url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            raw_content = data["choices"][0]["message"]["content"]
            result = _parse_json_response(raw_content)

            # Always set language and doc_type
            result["language"] = language
            result["doc_type"] = doc_type
            if not result.get("case_title") and filename:
                result["case_title"] = filename.replace(".pdf", "")

            logger.info(
                f"LLM extraction complete: model={model} "
                f"doc_type={doc_type} language={language} "
                f"fields={list(result.keys())}"
            )
            return result

    except Exception as e:
        logger.error(f"LLM extraction failed for {filename}: {e}")
        # Return minimal structure so pipeline can continue
        return {
            "language": language,
            "doc_type": doc_type,
            "case_title": filename.replace(".pdf", ""),
            "facts_summary": text[:500] if text else "",
            "extraction_failed": True
        }
