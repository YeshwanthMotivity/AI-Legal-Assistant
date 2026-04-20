from fastapi import APIRouter, Depends
from typing import List
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.user.schemas import UserResponse
from app.auth.rbac import require_role, UserRole
from app.modules.user.repository import UserRepository

router = APIRouter()

@router.get("/judges", response_model=List[UserResponse])
async def get_judges(
    session: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.CLERK))
):
    """Get all active judges (Clerk or higher)."""
    repository = UserRepository(session)
    users = await repository.get_by_role(UserRole.JUDGE)
    return [UserResponse.model_validate(user) for user in users]
