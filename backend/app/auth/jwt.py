from typing import Optional, Dict, Any
from jose import jwt, JWTError
import httpx
from app.config import settings

import logging

logger = logging.getLogger(__name__)

_jwks_cache = None

async def get_jwks():
    global _jwks_cache
    if not _jwks_cache:
        try:
            url = settings.keycloak_jwks_url
            async with httpx.AsyncClient() as client:
                r = await client.get(url)
                r.raise_for_status()
                _jwks_cache = r.json()
        except Exception:
            # If Keycloak is not reachable, don't cache error
            return None
    return _jwks_cache


async def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        # Decode unverified to see what's actually inside for debugging
        unverified = jwt.get_unverified_claims(token)
        
        jwks = await get_jwks()
        if not jwks:
            logger.error("JWT Verification: No JWKS available")
            return None
            
        try:
            # We verify the signature and issuer strictly.
            # We relax the audience check because Keycloak often defaults to 'account' 
            # or requires complex client scope mapping to include the client_id in 'aud'.
            payload = jwt.decode(
                token, jwks,
                algorithms=["RS256"],
                audience=settings.keycloak_client_id,
                issuer=settings.keycloak_issuer_url,
                options={"verify_aud": False}
            )
            return payload
        except JWTError as e:
            logger.warning(f"JWT Verification failed: {str(e)}. "
                           f"Token Claims: iss={unverified.get('iss')}, aud={unverified.get('aud')}. "
                           f"Expected: iss={settings.keycloak_issuer_url}")
            return None

            
    except Exception as e:
        logger.error(f"Unexpected error in verify_token: {str(e)}")
        return None





