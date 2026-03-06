from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.case.models import Case, CaseStatus
from app.modules.case.schemas import CaseCreate, CaseUpdate
import uuid
from datetime import datetime


class CaseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
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
    
    async def count(self, status: Optional[CaseStatus] = None) -> int:
        query = select(func.count(Case.id))
        if status:
            query = query.where(Case.status == status)
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def create(self, case_data: CaseCreate, created_by: str) -> Case:
        case_number = f"CASE-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
        case = Case(
            id=str(uuid.uuid4()),
            case_number=case_number,
            created_by=created_by,
            title=case_data.title,
            description=case_data.description,
            case_type=case_data.case_type,
            employee_name=case_data.employee_name,
            employer_name=case_data.employer_name,
            claim_amount=case_data.claim_amount,
            status=CaseStatus.PENDING,
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
        case.status = CaseStatus.ASSIGNED
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

