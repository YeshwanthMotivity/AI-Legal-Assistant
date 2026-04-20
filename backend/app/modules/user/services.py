from typing import Optional, List
from app.modules.user.schemas import UserCreate, UserUpdate, UserResponse
from app.modules.user.repository import UserRepository
from app.auth.keycloak import create_keycloak_user, update_keycloak_user_status, delete_keycloak_user
from fastapi import HTTPException, status


class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user in both Postgres and Keycloak."""
        # 1. Check local availability
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
        
        # 2. Create in Keycloak
        try:
            keycloak_id = await create_keycloak_user(
                email=user_data.email,
                username=user_data.username,
                password=user_data.password,
                role=user_data.role.value if hasattr(user_data.role, "value") else user_data.role,
                full_name=user_data.full_name
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user in Keycloak: {str(e)}"
            )
            
        # 3. Create in Postgres
        user = await self.user_repository.create(user_data, keycloak_id)
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
        """Update user locally."""
        user = await self.user_repository.update(user_id, user_data)
        if not user:
            return None
        # Note: If updating email/username, we should also update Keycloak
        return UserResponse.model_validate(user)
    
    async def delete_user(self, user_id: str) -> bool:
        """Deactivate user (soft delete). Defaults to disabling in Keycloak too."""
        user = await self.user_repository.get_by_id(user_id)
        if not user and user.keycloak_id:
            try:
                await update_keycloak_user_status(user.keycloak_id, enabled=False)
            except Exception:
                pass # Continue with local deactivation even if KC fails
                
        return await self.user_repository.delete(user_id)

    async def activate_user(self, user_id: str) -> bool:
        """Activate a previously deactivated user."""
        user = await self.user_repository.get_by_id(user_id)
        if user and user.keycloak_id:
            try:
                await update_keycloak_user_status(user.keycloak_id, enabled=True)
            except Exception:
                pass
                
        return await self.user_repository.activate(user_id)

    async def hard_delete_user(self, user_id: str) -> bool:
        """Permanently delete user from the database and Keycloak."""
        user = await self.user_repository.get_by_id(user_id)
        if user and user.keycloak_id:
            try:
                await delete_keycloak_user(user.keycloak_id)
            except Exception:
                pass
                
        return await self.user_repository.hard_delete(user_id)

