import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from app.config import settings


def create_access_token(payload: Dict[str, Any] = None, expires_delta: Optional[timedelta] = None, data: Dict[str, Any] = None) -> str:
    """Create a JWT access token."""
    to_encode = (data or payload or {}).copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def create_refresh_token(payload: Dict[str, Any] = None, expires_delta: Optional[timedelta] = None, data: Dict[str, Any] = None) -> str:
    """Create a JWT refresh token."""
    to_encode = (data or payload or {}).copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT refresh token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode a JWT token without verification (for debugging)."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm], options={"verify_signature": False})
        return payload
    except JWTError:
        return None

