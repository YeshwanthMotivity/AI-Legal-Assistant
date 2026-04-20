import json
import logging
import httpx
import re
from typing import Any
from app.config import settings

logger = logging.getLogger(__name__)

async def call_ollama(model_url: str, model_name: str, system: str, user: str, token_limit: int) -> str:
    """Generic Ollama /api/generate caller."""
    payload = {
        "model": model_name,
        "prompt": f"System: {system}\n\nUser Context: {user}\n\nAssistant Response (JSON ONLY):",
        "stream": False,
        "keep_alive": 0,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.1,
            "num_predict": token_limit
        },
    }
    
    async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
        try:
            resp = await client.post(model_url, json=payload)
            if resp.status_code != 200:
                logger.error(f"Ollama API Error {resp.status_code}: {resp.text}")
                resp.raise_for_status()
            
            data = resp.json()
            return str(data.get("response", ""))
        except Exception as e:
            logger.error(f"Ollama call failed: {e}")
            raise

def extract_json(raw: str) -> dict[str, Any] | None:
    """Find and parse the largest JSON object in a string."""
    raw = (raw or "").strip()
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None
