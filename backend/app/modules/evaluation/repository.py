import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.evaluation.models import EvaluationEvent


class EvaluationEventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_event(
        self,
        document_id: str,
        case_id: str,
        metric_type: str,
        entity_type: str,
        value: float,
        phase: str = "phase_1",
    ) -> EvaluationEvent:
        event = EvaluationEvent(
            id=str(uuid.uuid4()),
            document_id=document_id,
            case_id=case_id,
            metric_type=metric_type,
            entity_type=entity_type,
            value=value,
            phase=phase,
        )
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def create_search_event(
        self,
        query_id: str,
        case_id: str,
        metric_type: str,
        value: float,
    ) -> EvaluationEvent:
        event = EvaluationEvent(
            id=str(uuid.uuid4()),
            query_id=query_id,
            document_id=None,
            case_id=case_id,
            metric_type=metric_type,
            entity_type=None,
            value=value,
            phase="phase_2",
        )
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def get_phase2_averages(self) -> dict[str, float]:
        result = await self.db.execute(
            select(EvaluationEvent.metric_type, func.avg(EvaluationEvent.value))
            .where(EvaluationEvent.phase == "phase_2")
            .group_by(EvaluationEvent.metric_type)
        )
        rows = result.all()
        return {
            metric_type: float(avg_value) if avg_value is not None else 0.0
            for metric_type, avg_value in rows
        }

    async def create_similarity_event(
        self,
        run_id: str,
        case_id: str,
        metric_type: str,
        value: float,
    ) -> EvaluationEvent:
        event = EvaluationEvent(
            id=str(uuid.uuid4()),
            query_id=run_id,
            document_id=None,
            case_id=case_id,
            metric_type=metric_type,
            entity_type=None,
            value=value,
            phase="phase_3",
        )
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def get_phase3_averages(self) -> dict[str, float]:
        result = await self.db.execute(
            select(EvaluationEvent.metric_type, func.avg(EvaluationEvent.value))
            .where(EvaluationEvent.phase == "phase_3")
            .group_by(EvaluationEvent.metric_type)
        )
        rows = result.all()
        return {
            metric_type: float(avg_value) if avg_value is not None else 0.0
            for metric_type, avg_value in rows
        }
