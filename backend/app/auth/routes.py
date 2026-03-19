"""
Authentication routes for JWT-based login and token refresh.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import timedelta

from app.auth.jwt import create_access_token, create_refresh_token
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.user.models import User
import bcrypt

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, session: AsyncSession = Depends(get_db)):
    """
    Login endpoint.
    
    Authenticates user with email or username and password.
    Returns access and refresh tokens.
    """
    # Find user by email or username
    stmt = select(User).where((User.email == request.email) | (User.username == request.email))
    result = await session.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check password
    password_hash = getattr(user, "hashed_password", None) or getattr(user, "password_hash", None)
    if not password_hash or not bcrypt.checkpw(request.password.encode(), str(password_hash).encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if user is active
    is_active = user.is_active
    if isinstance(is_active, str):
        is_active = is_active.lower() in {"true", "1", "yes"}
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create tokens
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        },
        expires_delta=timedelta(hours=1)
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(days=7)
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(request: RefreshRequest, session: AsyncSession = Depends(get_db)):
    """
    Refresh access token using refresh token.
    
    Returns new access and refresh tokens.
    """
    from app.auth.jwt import verify_refresh_token
    
    payload = verify_refresh_token(request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    
    # Fetch user to get current role
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalars().first()
    
    is_active = None
    if user is not None:
        is_active = user.is_active
        if isinstance(is_active, str):
            is_active = is_active.lower() in {"true", "1", "yes"}

    if not user or not is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or is inactive"
        )
    
    # Create new tokens
    new_access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        },
        expires_delta=timedelta(hours=1)
    )
    new_refresh_token = create_refresh_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(days=7)
    )
    
    return LoginResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )
