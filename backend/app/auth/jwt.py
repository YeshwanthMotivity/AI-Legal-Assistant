from typing import Optional, Dict, Any
from jose import jwt, JWTError
import httpx
from app.config import settings

_jwks_cache = None

async def get_jwks():
    global _jwks_cache
    if not _jwks_cache:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(settings.keycloak_jwks_url)
                r.raise_for_status()
                _jwks_cache = r.json()
        except Exception:
            # If Keycloak is not reachable, don't cache error
            return None
    return _jwks_cache

async def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        jwks = await get_jwks()
        if not jwks:
            return None
            
        payload = jwt.decode(
            token, jwks,
            algorithms=["RS256"],
            audience=settings.keycloak_client_id,
            issuer=settings.keycloak_issuer
        )
        return payload
    except JWTError:
        return None
