from fastapi import APIRouter, Depends
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.audit.schemas import AuditLogResponse, AuditLogListResponse
from app.modules.audit.models import AuditLog
from app.auth.rbac import require_role, UserRole


router = APIRouter(prefix="/admin", tags=["Audit"])


async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
) -> AuditLogListResponse:
    """Get audit logs (Admin only)."""
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    logs = list(result.scalars().all())
    
    # Get total count
    from sqlalchemy import func
    count_query = select(func.count(AuditLog.id))
    if action:
        count_query = count_query.where(AuditLog.action == action)
    if user_id:
        count_query = count_query.where(AuditLog.user_id == user_id)
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()
    
    return AuditLogListResponse(
        total=total,
        items=[AuditLogResponse.model_validate(log) for log in logs]
    )



@router.get("/audit-logs", response_model=AuditLogListResponse)
async def get_audit_logs_endpoint(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    """Get audit logs (Admin only)."""
    return await get_audit_logs(skip, limit, action, user_id, db, current_user)


# Add a new router without /admin prefix for judges
judge_router = APIRouter(prefix="/audit", tags=["Audit"])

@judge_router.get("", response_model=List[AuditLogResponse])
async def get_case_activity(
    case_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    """Get activity for a specific case (accessible by Judges)."""
    query = select(AuditLog).where(
        AuditLog.resource_id == case_id
    ).order_by(AuditLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    logs = list(result.scalars().all())
    return [AuditLogResponse.model_validate(log) for log in logs]

