import time
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.case.models import CaseStatus
from app.modules.case.repository import CaseRepository
from app.modules.evaluation.judgment_repository import JudgmentRepository
from app.modules.evaluation.models import JudgeFeedback
from app.modules.evaluation.repository import EvaluationEventRepository
from app.modules.orchestrator.graph import orchestrator_graph
from app.modules.orchestrator.state import AnalysisState


class OrchestratorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.evaluation_repository = EvaluationEventRepository(db)
        self.case_repository = CaseRepository(db)
        self.judgment_repository = JudgmentRepository(db)

    async def run_analysis(self, case_id: str) -> dict[str, Any]:
        case = await self.case_repository.update_status(case_id, CaseStatus.AI_ANALYSIS_PENDING)
        if not case:
            raise ValueError(f"Case not found: {case_id}")
        await self.db.commit()

        ai_start_time = time.monotonic()
        run_id = f"orchestrator_{case_id}_{int(time.time())}"
        initial_state: AnalysisState = {
            "case_id": case_id,
            "entities": [],
            "search_results": [],
            "graph_results": {},
            "calculation": {},
            "context": {},
            "reasoning": {},
            "reasoning_status": "",
            "explainability": {},
            "draft_text": "",
            "error": None,
            "model_used": None,
            "db": self.db,
        }
        state = dict(await orchestrator_graph.ainvoke(initial_state))
        ai_latency = time.monotonic() - ai_start_time

        reasoning = state.get("reasoning", {}) or {}
        reasoning_status = state.get("reasoning_status", "") or ""
        confidence = float(reasoning.get("confidence", 0.0) or 0.0)
        reasoning_text = reasoning.get("reasoning")
        if not isinstance(reasoning_text, str):
            reasoning_text = str(reasoning_text) if reasoning_text is not None else None
        cited_laws = reasoning.get("cited_laws", []) or []
        cited_cases = reasoning.get("cited_cases", []) or []
        if not isinstance(cited_laws, list):
            cited_laws = []
        if not isinstance(cited_cases, list):
            cited_cases = []

        await self.judgment_repository.upsert_analysis(
            case_id=case_id,
            draft_text=state.get("draft_text", "") or "",
            ai_confidence_score=confidence,
            outcome=reasoning.get("outcome"),
            reasoning=reasoning_text,
            cited_laws=cited_laws,
            cited_cases=cited_cases,
            model_used=state.get("model_used"),
            explainability=state.get("explainability", {}) or {},
            reasoning_status=reasoning_status or "ok",
        )

        if reasoning_status == "reasoning_unavailable":
            await self.case_repository.update_status(case_id, CaseStatus.AI_ANALYSIS_PENDING)
        else:
            await self.case_repository.update_status(case_id, CaseStatus.AI_ANALYSIS_READY)

        await self.evaluation_repository.create_ai_event(
            run_id=run_id,
            case_id=case_id,
            metric_type="ai_latency",
            value=ai_latency,
        )
        await self.evaluation_repository.create_ai_event(
            run_id=run_id,
            case_id=case_id,
            metric_type="ai_confidence",
            value=confidence,
        )
        await self.db.commit()
        state.pop("db", None)
        return state

    async def finalize_judgment(self, case_id: str, final_text: str, judge_id: str) -> dict[str, Any]:
        judgment = await self.judgment_repository.finalize(case_id, final_text, judge_id)
        if not judgment:
            raise ValueError(f"Judgment not found for case: {case_id}")

        await self.case_repository.update_status(case_id, CaseStatus.FINALIZED)
        await self.db.commit()
        return {
            "id": judgment.id,
            "case_id": judgment.case_id,
            "judge_id": judgment.judge_id,
            "judgment_text": judgment.judgment_text,
            "decision": judgment.decision,
            "compensation_amount": judgment.compensation_amount,
            "is_finalized": judgment.is_finalized,
            "created_at": judgment.created_at,
            "finalized_at": judgment.finalized_at,
        }

    async def record_feedback(self, case_id: str, feedback_data: dict[str, Any], judge_id: str) -> dict[str, Any]:
        judgment = await self.judgment_repository.get_by_case_id(case_id)
        if not judgment:
            raise ValueError(f"Judgment not found for case: {case_id}")

        feedback = JudgeFeedback(
            id=str(uuid.uuid4()),
            judgment_id=judgment.id,
            case_id=case_id,
            judge_id=judge_id,
            legal_relevance_score=float(feedback_data.get("legal_relevance_score", 0)),
            reasoning_quality_score=float(feedback_data.get("reasoning_quality_score", 0)),
            explanation_clarity_score=float(feedback_data.get("explanation_clarity_score", 0)),
            feedback_text=feedback_data.get("feedback_text"),
            suggested_improvements=feedback_data.get("suggested_improvements"),
            created_at=datetime.utcnow(),
        )
        self.db.add(feedback)

        run_id = f"feedback_{case_id}_{int(time.time())}"
        await self.evaluation_repository.create_ai_event(
            run_id=run_id,
            case_id=case_id,
            metric_type="outcome_agreement",
            value=1.0,
        )
        await self.evaluation_repository.create_ai_event(
            run_id=run_id,
            case_id=case_id,
            metric_type="legal_relevance_score",
            value=float(feedback_data.get("legal_relevance_score", 0.0)),
        )
        await self.evaluation_repository.create_ai_event(
            run_id=run_id,
            case_id=case_id,
            metric_type="reasoning_quality_score",
            value=float(feedback_data.get("reasoning_quality_score", 0.0)),
        )
        await self.evaluation_repository.create_ai_event(
            run_id=run_id,
            case_id=case_id,
            metric_type="explanation_clarity_score",
            value=float(feedback_data.get("explanation_clarity_score", 0.0)),
        )
        await self.db.commit()

        return {
            "id": feedback.id,
            "judgment_id": feedback.judgment_id,
            "case_id": feedback.case_id,
            "judge_id": feedback.judge_id,
            "created_at": feedback.created_at,
        }
