from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.rbac import require_role, UserRole
from app.modules.similarity.schemas import (
    SimilarityResponse,
    PrecedentDetail,
    PrecedentChatRequest,
    PrecedentChatResponse,
)
from app.modules.similarity.services import SimilarityService


router = APIRouter(prefix="", tags=["Similarity"])


@router.post("/cases/{case_id}/similarity", response_model=SimilarityResponse)
async def find_similar_cases(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN, UserRole.CLERK)),
):
    """
    Find similar cases based on case summary embedding and reranking.
    """
    service = SimilarityService(db)
    return await service.find_similar(case_id)


@router.get("/precedents/{precedent_id}", response_model=PrecedentDetail)
async def get_precedent_details(
    precedent_id: str,
    language: str = "en",
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN, UserRole.CLERK)),
):
    """Fetch full text and details of a specific precedent."""
    service = SimilarityService(db)
    return await service.get_precedent(precedent_id, language=language)


@router.post("/precedents/{precedent_id}/chat", response_model=PrecedentChatResponse)
async def chat_with_precedent(
    precedent_id: str,
    request: PrecedentChatRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN, UserRole.CLERK)),
):
    """Interact with a specific precedent using AI chat."""
    service = SimilarityService(db)
    return await service.precedent_chat(precedent_id, request)

