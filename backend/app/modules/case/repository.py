from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.case.models import Case, CaseStatus
from app.modules.case.schemas import CaseCreate, CaseUpdate
import uuid
from datetime import datetime, timezone
from sqlalchemy import or_


class CaseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _normalize_datetime(value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return None
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
    
    async def get_by_id(self, case_id: str) -> Optional[Case]:
        result = await self.db.execute(select(Case).where(Case.id == case_id))
        return result.scalar_one_or_none()
    
    async def get_by_case_number(self, case_number: str) -> Optional[Case]:
        result = await self.db.execute(select(Case).where(Case.case_number == case_number))
        return result.scalar_one_or_none()
    
    async def get_all(self, skip: int = 0, limit: int = 100, status: Optional[CaseStatus] = None) -> List[Case]:
        query = select(Case)
        if status:
            query = query.where(Case.status == status)
        query = query.offset(skip).limit(limit).order_by(Case.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_by_assigned_user(self, user_id: str, skip: int = 0, limit: int = 100) -> List[Case]:
        result = await self.db.execute(
            select(Case).where(Case.assigned_to == user_id).offset(skip).limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_by_judge(self, judge_id: str, skip: int = 0, limit: int = 100) -> List[Case]:
        query = (
            select(Case)
            .where(or_(Case.assigned_to == judge_id, Case.created_by == judge_id))
            .offset(skip)
            .limit(limit)
            .order_by(Case.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_clerk_visible(self, skip: int = 0, limit: int = 100, status: Optional[CaseStatus] = None) -> List[Case]:
        query = select(Case).where(Case.status != CaseStatus.FINALIZED)
        if status:
            query = query.where(Case.status == status)
        query = query.offset(skip).limit(limit).order_by(Case.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_judge(self, judge_id: str) -> int:
        result = await self.db.execute(
            select(func.count(Case.id)).where(or_(Case.assigned_to == judge_id, Case.created_by == judge_id))
        )
        return result.scalar_one()

    async def count_clerk_visible(self, status: Optional[CaseStatus] = None) -> int:
        query = select(func.count(Case.id)).where(Case.status != CaseStatus.FINALIZED)
        if status:
            query = query.where(Case.status == status)
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def count(self, status: Optional[CaseStatus] = None) -> int:
        query = select(func.count(Case.id))
        if status:
            query = query.where(Case.status == status)
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def create(self, case_data: CaseCreate, created_by: str) -> Case:
        case_number = f"CASE-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
        filing_date = self._normalize_datetime(case_data.filing_date)
        hearing_date = self._normalize_datetime(case_data.hearing_date)
        case = Case(
            id=str(uuid.uuid4()),
            case_number=case_number,
            created_by=created_by,
            title=case_data.title,
            description=case_data.description,
            case_type=case_data.case_type,
            claimant_name=case_data.claimant_name,
            respondent_name=case_data.respondent_name,
            filing_date=filing_date,
            hearing_date=hearing_date,
            court_number=case_data.court_number,
            notes=case_data.notes,
            claim_amount=case_data.claim_amount,
            status=CaseStatus.CREATED,
        )
        self.db.add(case)
        await self.db.flush()
        await self.db.refresh(case)
        return case
    
    async def update(self, case_id: str, case_data: CaseUpdate) -> Optional[Case]:
        case = await self.get_by_id(case_id)
        if not case:
            return None
        
        update_data = case_data.model_dump(exclude_unset=True)
        if "filing_date" in update_data:
            update_data["filing_date"] = self._normalize_datetime(update_data["filing_date"])
        if "hearing_date" in update_data:
            update_data["hearing_date"] = self._normalize_datetime(update_data["hearing_date"])
        if "judgment_date" in update_data:
            update_data["judgment_date"] = self._normalize_datetime(update_data["judgment_date"])
        for key, value in update_data.items():
            setattr(case, key, value)
        
        await self.db.flush()
        await self.db.refresh(case)
        return case
    
    async def assign(self, case_id: str, user_id: str) -> Optional[Case]:
        case = await self.get_by_id(case_id)
        if not case:
            return None
        
        case.assigned_to = user_id
        case.status = CaseStatus.DOCUMENTS_UPLOADED
        await self.db.flush()
        await self.db.refresh(case)
        return case
    
    async def update_status(self, case_id: str, status: CaseStatus) -> Optional[Case]:
        case = await self.get_by_id(case_id)
        if not case:
            return None
        
        case.status = status
        await self.db.flush()
        await self.db.refresh(case)
        return case
    
    async def delete(self, case_id: str) -> bool:
        case = await self.get_by_id(case_id)
        if not case:
            return False
        
        await self.db.delete(case)
        await self.db.flush()
        return True

