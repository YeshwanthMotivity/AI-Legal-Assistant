import uuid
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.evaluation.models import EvaluationEvent


class EvaluationEventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------ #
    #  Generic event creation                                             #
    # ------------------------------------------------------------------ #

    async def create_event(
        self,
        metric_type: str,
        value: float,
        phase: str = "phase_1",
        document_id: Optional[str] = None,
        case_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        query_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> EvaluationEvent:
        event = EvaluationEvent(
            id=str(uuid.uuid4()),
            document_id=document_id,
            case_id=case_id,
            metric_type=metric_type,
            entity_type=entity_type,
            query_id=query_id,
            value=value,
            phase=phase,
            metadata_=metadata,
        )
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    # ------------------------------------------------------------------ #
    #  Phase-specific convenience writers (keep API for existing callers) #
    # ------------------------------------------------------------------ #

    async def create_search_event(
        self,
        query_id: str,
        case_id: Optional[str],
        metric_type: str,
        value: float,
        metadata: Optional[dict] = None,
    ) -> EvaluationEvent:
        return await self.create_event(
            metric_type=metric_type,
            value=value,
            phase="phase_2",
            case_id=case_id,
            query_id=query_id,
            metadata=metadata,
        )

    async def create_similarity_event(
        self,
        run_id: str,
        case_id: str,
        metric_type: str,
        value: float,
    ) -> EvaluationEvent:
        return await self.create_event(
            metric_type=metric_type,
            value=value,
            phase="phase_3",
            case_id=case_id,
            query_id=run_id,
        )

    async def create_graph_event(
        self,
        run_id: str,
        case_id: str,
        metric_type: str,
        value: float,
    ) -> EvaluationEvent:
        return await self.create_event(
            metric_type=metric_type,
            value=value,
            phase="phase_4",
            case_id=case_id,
            query_id=run_id,
        )

    async def create_ai_event(
        self,
        run_id: str,
        case_id: str,
        metric_type: str,
        value: float,
    ) -> EvaluationEvent:
        return await self.create_event(
            metric_type=metric_type,
            value=value,
            phase="phase_5",
            case_id=case_id,
            query_id=run_id,
        )

    # ------------------------------------------------------------------ #
    #  Scalar aggregations (per-phase averages for flat metrics API)      #
    # ------------------------------------------------------------------ #

    async def _phase_averages(self, phase: str) -> dict[str, float]:
        result = await self.db.execute(
            select(EvaluationEvent.metric_type, func.avg(EvaluationEvent.value))
            .where(EvaluationEvent.phase == phase)
            .group_by(EvaluationEvent.metric_type)
        )
        return {
            mt: float(avg) if avg is not None else 0.0
            for mt, avg in result.all()
        }

    async def get_phase1_averages(self) -> dict[str, float]:
        """Entity-extraction accuracy grouped by entity_type."""
        result = await self.db.execute(
            select(EvaluationEvent.entity_type, func.avg(EvaluationEvent.value))
            .where(EvaluationEvent.phase == "phase_1")
            .group_by(EvaluationEvent.entity_type)
        )
        return {
            (et or "unknown"): float(avg) if avg is not None else 0.0
            for et, avg in result.all()
        }

    async def get_phase2_averages(self) -> dict[str, float]:
        return await self._phase_averages("phase_2")

    async def get_phase3_averages(self) -> dict[str, float]:
        return await self._phase_averages("phase_3")

    async def get_phase4_averages(self) -> dict[str, float]:
        return await self._phase_averages("phase_4")

    async def get_phase5_averages(self) -> dict[str, float]:
        return await self._phase_averages("phase_5")

    # ------------------------------------------------------------------ #
    #  Time-series query                                                  #
    # ------------------------------------------------------------------ #

    async def get_time_series(
        self,
        metric_type: str,
        phase: str,
        window_hours: int = 24,
    ) -> list[dict]:
        """
        Returns hourly-bucketed averages for (metric_type, phase) within the
        given trailing window.  Uses date_trunc on PostgreSQL.
        """
        since = datetime.utcnow() - timedelta(hours=window_hours)
        result = await self.db.execute(
            text(
                """
                SELECT
                    date_trunc('hour', created_at) AS bucket,
                    AVG(value)                     AS avg_value
                FROM evaluation_events
                WHERE metric_type = :metric_type
                  AND phase       = :phase
                  AND created_at >= :since
                GROUP BY bucket
                ORDER BY bucket ASC
                """
            ),
            {"metric_type": metric_type, "phase": phase, "since": since},
        )
        return [
            {"bucket": row[0].isoformat(), "value": float(row[1])}
            for row in result.all()
            if row[0] is not None
        ]

    async def get_metrics_summary(
        self,
        phase: Optional[str],
        window_hours: int = 24,
    ) -> dict[str, float]:
        """Average per metric_type for a phase within the time window."""
        since = datetime.utcnow() - timedelta(hours=window_hours)
        query = (
            select(EvaluationEvent.metric_type, func.avg(EvaluationEvent.value))
            .where(EvaluationEvent.created_at >= since)
            .group_by(EvaluationEvent.metric_type)
        )
        if phase:
            query = query.where(EvaluationEvent.phase == phase)
        result = await self.db.execute(query)
        return {
            mt: float(avg) if avg is not None else 0.0
            for mt, avg in result.all()
        }

    # ------------------------------------------------------------------ #
    #  Benchmark-specific helpers                                         #
    # ------------------------------------------------------------------ #

    async def get_latest_benchmark_run_id(self, mode: str) -> Optional[str]:
        """Returns the most recent query_id for a benchmark run in a given mode."""
        result = await self.db.execute(
            select(EvaluationEvent.query_id, func.max(EvaluationEvent.created_at))
            .where(EvaluationEvent.phase == "phase_2")
            .where(
                EvaluationEvent.metadata_["mode"].astext == mode
            )
            .group_by(EvaluationEvent.query_id)
            .order_by(func.max(EvaluationEvent.created_at).desc())
            .limit(1)
        )
        row = result.first()
        return row[0] if row else None

    async def get_benchmark_averages(self, run_id: str) -> dict[str, float]:
        """Average metric values for a specific benchmark run_id."""
        result = await self.db.execute(
            select(EvaluationEvent.metric_type, func.avg(EvaluationEvent.value))
            .where(EvaluationEvent.query_id == run_id)
            .where(EvaluationEvent.phase == "phase_2")
            .group_by(EvaluationEvent.metric_type)
        )
        return {
            mt: float(avg) if avg is not None else 0.0
            for mt, avg in result.all()
        }

    async def get_benchmark_query_count(self, run_id: str) -> int:
        """Number of individual query evaluations in a benchmark run."""
        result = await self.db.execute(
            select(func.count(EvaluationEvent.id))
            .where(EvaluationEvent.query_id == run_id)
            .where(EvaluationEvent.phase == "phase_2")
        )
        return result.scalar_one() or 0
