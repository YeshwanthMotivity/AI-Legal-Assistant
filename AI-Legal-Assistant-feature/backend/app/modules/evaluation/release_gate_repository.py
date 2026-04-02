import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.evaluation.models import ReleaseGate


class ReleaseGateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_gate(
        self,
        phase: str,
        mode: str,
        status: str,
        rationale: str,
        judge_sign_off: str,
        decided_by: Optional[str] = None,
        benchmark_run_id: Optional[str] = None,
    ) -> ReleaseGate:
        gate = ReleaseGate(
            id=str(uuid.uuid4()),
            phase=phase,
            mode=mode,
            status=status,
            rationale=rationale,
            judge_sign_off=judge_sign_off,
            decided_by=decided_by,
            decided_at=datetime.utcnow() if status in ("approved", "deferred") else None,
            benchmark_run_id=benchmark_run_id,
        )
        self.db.add(gate)
        await self.db.flush()
        await self.db.refresh(gate)
        return gate

    async def list_gates(self, phase: Optional[str] = None) -> list[ReleaseGate]:
        query = select(ReleaseGate).order_by(ReleaseGate.created_at.desc())
        if phase:
            query = query.where(ReleaseGate.phase == phase)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_latest_by_phase(self, phase: str) -> Optional[ReleaseGate]:
        result = await self.db.execute(
            select(ReleaseGate)
            .where(ReleaseGate.phase == phase)
            .order_by(ReleaseGate.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
