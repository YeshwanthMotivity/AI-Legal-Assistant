from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.modules.case.schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseListResponse,
    CaseAssign, CaseAnalyzeResponse, CaseAnalysisResponse,
    JudgmentDraftRequest, JudgmentDraftResponse,
    JudgmentRequest, JudgmentResponse,
    FeedbackRequest, FeedbackResponse
)
from app.modules.case.repository import CaseRepository
from app.modules.case.services import CaseService
from app.auth.rbac import require_role, UserRole


router = APIRouter(prefix="/cases", tags=["Cases"])


def get_case_service(db: AsyncSession = Depends(get_db)) -> CaseService:
    repository = CaseRepository(db)
    return CaseService(db, repository)


@router.get("", response_model=CaseListResponse)
async def get_cases(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    """Get all cases."""
    return await service.get_all_cases(user_id=current_user["sub"], user_role=current_user["role"], skip=skip, limit=limit, status=status)


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    """Create a new case."""
    case = await service.create_case(case_data, current_user["sub"])
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "create_case", "case", case.id)
    return case


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    """Get case by ID."""
    case = await service.get_case(case_id, user_id=current_user["sub"], user_role=current_user["role"])
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return case


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_data: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK))
):
    """Update case."""
    case = await service.update_case(case_id, case_data)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "update_case", "case", case.id)
    return case


@router.patch("/{case_id}/assign", response_model=CaseResponse)
async def assign_case(
    case_id: str,
    assign_data: CaseAssign,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Assign case to a user."""
    case = await service.assign_case(case_id, assign_data.assigned_to)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "assign_case", "case", case.id)
    return case


@router.post("/{case_id}/analyze", response_model=CaseAnalyzeResponse)
async def analyze_case(
    case_id: str,
    background_tasks: BackgroundTasks,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    """Analyze case with AI."""
    # Verify case exists
    case = await service.get_case(case_id, user_id=current_user["sub"], user_role=current_user["role"])
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return await service.analyze_case(case_id, background_tasks)


@router.get("/{case_id}/analysis", response_model=CaseAnalysisResponse)
async def get_case_analysis(
    case_id: str,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    """Get case analysis."""
    case = await service.get_case(case_id, user_id=current_user["sub"], user_role=current_user["role"])
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return await service.get_case_analysis(case_id)


@router.post("/{case_id}/draft", response_model=JudgmentDraftResponse)
async def draft_judgment(
    case_id: str,
    draft_request: JudgmentDraftRequest,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    """Generate judgment draft."""
    case = await service.get_case(case_id, user_id=current_user["sub"], user_role=current_user["role"])
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return await service.draft_judgment(case_id)


@router.post("/{case_id}/judgment", response_model=JudgmentResponse)
async def create_judgment(
    case_id: str,
    judgment_data: JudgmentRequest,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    """Create judgment for case."""
    case = await service.get_case(case_id, user_id=current_user["sub"], user_role=current_user["role"])
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    judgment_res = await service.create_judgment(case_id, judgment_data.model_dump(), current_user["sub"])
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "finalize_judgment", "case", case_id)
    return judgment_res


@router.post("/{case_id}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    case_id: str,
    feedback_data: FeedbackRequest,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    """Submit judge feedback."""
    case = await service.get_case(case_id, user_id=current_user["sub"], user_role=current_user["role"])
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return await service.submit_feedback(case_id, feedback_data.model_dump(), current_user["sub"])


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE))
):
    """Delete case."""
    success = await service.delete_case(case_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "delete_case", "case", case_id)
    return None

