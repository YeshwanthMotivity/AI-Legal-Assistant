import logging
from typing import Tuple, List, Optional
from app.utils.ai import call_ollama, extract_json
from app.config import settings
from app.modules.ingestion.ocr import run_ocr

logger = logging.getLogger(__name__)

async def validate_document_relevance(
    file_bytes: bytes,
    file_name: str,
    mime_type: str,
    selected_categories: List[str],
    case_title: str,
    case_description: str,
    claimant_name: Optional[str] = None,
    respondent_name: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Validates if a document is relevant to the case and matches the selected categories.
    Returns (is_relevant, message).
    """
    try:
        # 1. Extract a sample of text (first 4000 chars should be enough for metadata/type check)
        raw_text = await run_ocr(file_bytes, mime_type)
        text_sample = raw_text[:4000] if raw_text else ""
        
        if not text_sample.strip():
            # If no text could be extracted, we might still want to allow based on filename if it's an image
            # but for legal documents, empty is suspicious.
            logger.warning(f"No text extracted from {file_name}")
            # We'll let the LLM decide based on the filename if sample is empty
        
        # 2. Call LLM for audit
        model_url = f"{settings.ollama_url}/api/generate"
        model_name = settings.ollama_model_fallback # Use faster model for validation
        
        system_prompt = (
            "You are a Quality Judicial Auditor. Analyze relevance based on PARTY NAMES and CASE FACTS.\n"
            "RULE 1: If the document mentions BOTH parties '{claimant}' AND '{respondent}', is_relevant=true.\n"
            "RULE 2: If names are missing, you MUST verify the content is directly related to the Case Facts ('{desc}'). Reject generic pricing, technical manuals, or unrelated business projects.\n"
            "RULE 3: If the document mentions DIFFERENT specific parties, is_relevant=false.\n\n"
            "Respond ONLY JSON:\n"
            "{{\"is_relevant\":bool, \"detected_type\":string, \"matches_category\":bool, \"explanation\":string}}"
        ).format(
            claimant=claimant_name or "N/A", 
            respondent=respondent_name or "N/A",
            desc=case_description[:200]
        )
        
        user_context = (
            f"Case: {case_title}\n"
            f"Desc: {case_description}\n"
            f"Claimant: {claimant_name or 'N/A'}\n"
            f"Respondent: {respondent_name or 'N/A'}\n"
            f"Categories: {', '.join(selected_categories)}\n"
            f"File: {file_name}\n"
            f"Text: {text_sample[:2500]}"
        )
        
        response_text = await call_ollama(
            model_url=model_url,
            model_name=model_name,
            system=system_prompt,
            user=user_context,
            token_limit=200
        )
        
        result = extract_json(response_text)
        if not result:
            logger.error(f"Failed to parse LLM response for relevance: {response_text}")
            return True, "Validation skipped due to system error."
        
        is_relevant = result.get("is_relevant", True)
        matches_category = result.get("matches_category", True)
        detected_type = result.get("detected_type", "Unknown")
        explanation = result.get("explanation", "No detailed explanation provided.")
        
        if not is_relevant:
            # More descriptive message for the user
            return False, "Upload failed: This document is not relevant to the case."
        
        # If is_relevant is true, we allow the upload even if category matching was strict previously.
        # This ensures that if the parties match (the primary concern), the file gets in.
        return True, "Document validated successfully."
        
    except Exception as e:
        logger.exception(f"Error during document relevance validation: {e}")
        return True, "Validation bypassed due to processing error."
