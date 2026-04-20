import asyncio
import json
import logging
import random
import httpx
import re
from typing import Any
from app.config import settings

logger = logging.getLogger(__name__)

_OLLAMA_MAX_RETRIES = 3
_OLLAMA_RETRY_BASE = 2.0   # seconds; doubles each attempt with ±25 % jitter


async def call_ollama(model_url: str, model_name: str, system: str, user: str, token_limit: int) -> str:
    """
    Generic Ollama /api/generate caller with exponential-backoff retries.
    Raises on permanent failure after _OLLAMA_MAX_RETRIES attempts.
    """
    payload = {
        "model": model_name,
        "prompt": f"System: {system}\n\nUser Context: {user}\n\nAssistant Response (JSON ONLY):",
        "stream": False,
        "keep_alive": 0,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.1,
            "num_predict": token_limit,
        },
    }

    last_exc: Exception = RuntimeError("No attempts made")
    for attempt in range(1, _OLLAMA_MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
                resp = await client.post(model_url, json=payload)
                if resp.status_code != 200:
                    logger.error("Ollama API Error %s (attempt %d): %s", resp.status_code, attempt, resp.text[:200])
                    resp.raise_for_status()
                data = resp.json()
                return str(data.get("response", ""))
        except Exception as exc:
            last_exc = exc
            if attempt == _OLLAMA_MAX_RETRIES:
                break
            delay = _OLLAMA_RETRY_BASE * (2 ** (attempt - 1)) * (0.75 + random.random() * 0.5)
            logger.warning("Ollama call failed (attempt %d/%d), retrying in %.1fs: %s",
                           attempt, _OLLAMA_MAX_RETRIES, delay, exc)
            await asyncio.sleep(delay)

    logger.error("Ollama permanently failed after %d attempts: %s", _OLLAMA_MAX_RETRIES, last_exc)
    raise last_exc

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
