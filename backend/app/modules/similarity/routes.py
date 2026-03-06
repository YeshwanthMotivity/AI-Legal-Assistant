from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.rbac import require_role, UserRole
from app.modules.similarity.schemas import SimilarityResponse
from app.modules.similarity.services import SimilarityService


router = APIRouter(prefix="", tags=["Similarity"])


@router.post("/cases/{case_id}/similarity", response_model=SimilarityResponse)
async def find_similar_cases(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN)),
):
    """
    Find similar cases based on case summary embedding and reranking.
    
    This endpoint:
    1. Retrieves the case and constructs a summary from title, case_type, employee_name, and employer_name
    2. Embeds the summary using BGE-M3
    3. Performs ANN search on case_summaries collection filtered by case_type
    4. Reranks results using BGE Reranker
    5. Computes confidence scores and returns top 5 similar cases
    6. Emits KPI events for tracking
    """
    service = SimilarityService(db)
    return await service.find_similar(case_id)

