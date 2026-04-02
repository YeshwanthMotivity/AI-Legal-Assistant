from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.rbac import require_role, UserRole
from app.modules.search.schemas import SearchRequest, SearchResponse
from app.modules.search.services import SearchService


router = APIRouter(prefix="", tags=["Search"])


@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN)),
):
    service = SearchService(db)
    return await service.search(request)
