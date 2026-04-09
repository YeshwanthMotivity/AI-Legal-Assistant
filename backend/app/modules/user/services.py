from typing import Optional, List
from app.modules.user.schemas import UserCreate, UserUpdate, UserResponse, UserLogin, TokenResponse
from app.modules.user.repository import UserRepository
from app.auth.jwt import create_access_token, create_refresh_token, verify_token
from fastapi import HTTPException, status
import uuid


class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    async def authenticate_user(self, login_data: UserLogin) -> Optional[dict]:
        """Authenticate user with username and password."""
        user = await self.user_repository.get_by_username(login_data.username)
        if not user:
            return None

        is_active = str(getattr(user, "is_active", "false")).lower() in {"true", "1", "yes"}
        if not is_active:
            return None
        
        if not await self.user_repository.verify_password(login_data.password, user.hashed_password):
            return None
        
        return self._create_token_payload(user)
    
    async def login(self, login_data: UserLogin) -> TokenResponse:
        """Login user and return tokens."""
        user_payload = await self.authenticate_user(login_data)
        if not user_payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )
        
        access_token = create_access_token(user_payload)
        refresh_token = create_refresh_token(user_payload)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    
    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token."""
        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        
        user = await self.user_repository.get_by_id(payload.get("sub"))
        if not user or str(getattr(user, "is_active", "false")).lower() not in {"true", "1", "yes"}:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Create new tokens
        new_payload = {
            "sub": payload.get("sub"),
            "username": payload.get("username"),
            "role": user.role.value if hasattr(user.role, "value") else user.role,
        }
        
        access_token = create_access_token(new_payload)
        new_refresh_token = create_refresh_token(new_payload)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
        )
    
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user."""
        # Check if user already exists
        existing_user = await self.user_repository.get_by_email_any(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        existing_username = await self.user_repository.get_by_username_any(user_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        
        user = await self.user_repository.create(user_data)
        return UserResponse.model_validate(user)
    
    async def get_user(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID."""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            return None
        return UserResponse.model_validate(user)
    
    async def get_all_users(self, skip: int = 0, limit: int = 100) -> List[UserResponse]:
        """Get all users."""
        users = await self.user_repository.get_all(skip, limit)
        return [UserResponse.model_validate(user) for user in users]
    
    async def get_users_by_role(self, role: str, skip: int = 0, limit: int = 100) -> List[UserResponse]:
        """Get users by role."""
        users = await self.user_repository.get_by_role(role, skip, limit)
        return [UserResponse.model_validate(user) for user in users]
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[UserResponse]:
        """Update user."""
        user = await self.user_repository.update(user_id, user_data)
        if not user:
            return None
        return UserResponse.model_validate(user)
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user."""
        return await self.user_repository.delete(user_id)
    
    def _create_token_payload(self, user) -> dict:
        """Create token payload from user object."""
        return {
            "sub": user.id,
            "username": user.username,
            "role": user.role.value if hasattr(user.role, 'value') else user.role,
        }

