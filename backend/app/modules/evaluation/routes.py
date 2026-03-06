from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.modules.evaluation.schemas import MetricsResponse
from app.modules.evaluation.repository import EvaluationEventRepository
from app.auth.rbac import require_role, UserRole


router = APIRouter(prefix="/admin", tags=["Evaluation"])


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Get evaluation metrics (Admin only)."""
    repository = EvaluationEventRepository(db)
    phase2_averages = await repository.get_phase2_averages()
    phase3_averages = await repository.get_phase3_averages()
    phase4_averages = await repository.get_phase4_averages()

    return MetricsResponse(
        precision_at_5=phase2_averages.get("precision_at_5", 0.0),
        recall_at_5=phase2_averages.get("recall_at_5", 0.0),
        mrr=phase2_averages.get("mrr", 0.0),
        top_5_accuracy=phase3_averages.get("top_5_accuracy", 0.0),
        avg_similarity_score=phase3_averages.get("avg_similarity_score", 0.0),
        graph_confidence=phase4_averages.get("graph_confidence", 0.0),
        entity_extraction_accuracy=0.0,
        outcome_agreement=0.0,
        judge_score=0.0,
        search_latency=0.0,
        ai_latency=0.0,
    )

