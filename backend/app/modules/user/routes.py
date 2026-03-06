from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.modules.user.schemas import (
    UserCreate, UserUpdate, UserResponse, UserLogin, TokenResponse
)
from app.modules.user.repository import UserRepository
from app.modules.user.services import UserService
from app.auth.rbac import require_role, UserRole


router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    repository = UserRepository(db)
    return UserService(repository)


# Auth routes
@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    service: UserService = Depends(get_user_service)
):
    """Login and receive access and refresh tokens."""
    return await service.login(login_data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    service: UserService = Depends(get_user_service)
):
    """Refresh access token using refresh token."""
    return await service.refresh_access_token(refresh_token)


# Admin user management routes
admin_router = APIRouter(prefix="/admin/users", tags=["User Management"])


def get_admin_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    repository = UserRepository(db)
    return UserService(repository)


@admin_router.get("", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    service: UserService = Depends(get_admin_user_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Get all users (Admin only)."""
    return await service.get_all_users(skip, limit)


@admin_router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_admin_user_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Create a new user (Admin only)."""
    return await service.create_user(user_data)


@admin_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    service: UserService = Depends(get_admin_user_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Delete a user (Admin only)."""
    success = await service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

