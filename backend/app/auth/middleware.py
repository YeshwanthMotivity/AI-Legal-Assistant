from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.auth.jwt import verify_token


security = HTTPBearer(auto_error=False)


async def extract_token(credentials: HTTPAuthorizationCredentials = None) -> Optional[dict]:
    """Extract and verify JWT token from request."""
    if credentials is None:
        return None
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


async def get_current_user(credentials: HTTPAuthorizationCredentials = None) -> dict:
    """Get current user from JWT token."""
    payload = await extract_token(credentials)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


class JWTMiddleware:
    """JWT Authentication Middleware."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Let FastAPI handle authentication via dependency injection
        await self.app(scope, receive, send)

