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

    async def run_analysis(self, case_id: str, user_id: str, language: str = "en") -> dict[str, Any]:
        case = await self.case_repository.update_status(case_id, CaseStatus.AI_ANALYSIS_PENDING)
        if not case:
            raise ValueError(f"Case not found: {case_id}")
        await self.db.commit()

        from app.modules.audit.service import AuditService
        await AuditService(self.db).log(
            user_id=user_id,
            action="ai_analysis_started",
            resource_type="case",
            resource_id=case_id,
            metadata={
                "phase": "Intelligence_Initialization",
                "description": "Triggering high-fidelity judicial AI analysis pipeline."
            }
        )

        ai_start_time = time.monotonic()
        run_id = f"orchestrator_{case_id}_{int(time.time())}"
        from app.database import AsyncSessionLocal
        initial_state: AnalysisState = {
            "user_id": user_id,
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
            "query_language": language,
            "ui_language": language or "en",
            # Pass the session used by the calling service (sequential nodes only).
            # Parallel nodes must NOT use this — they create their own sessions via db_factory.
            "db": self.db,
            "db_factory": AsyncSessionLocal,
        }
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Starting orchestration graph for case {case_id}")
        
        try:
            state = dict(await orchestrator_graph.ainvoke(initial_state))
        except Exception as e:
            logger.error(f"Graph execution failed for case {case_id}: {e}")
            raise
            
        ai_latency = time.monotonic() - ai_start_time
        logger.info(f"Orchestration graph complete for case {case_id} in {ai_latency:.2f}s")

        reasoning = state.get("reasoning", {}) or {}
        reasoning_status = state.get("reasoning_status", "") or ""
        confidence = float(reasoning.get("confidence", 0.85) or 0.85)
        reasoning_text = reasoning.get("reasoning")
        if not isinstance(reasoning_text, str):
            reasoning_text = str(reasoning_text) if reasoning_text is not None else ""
            
        from app.modules.orchestrator.nodes import _is_hallucination
        
        cited_laws = [l for l in (reasoning.get("cited_laws", []) or []) if not _is_hallucination(str(l))]
        cited_cases = [c for c in (reasoning.get("cited_cases", []) or []) if not _is_hallucination(str(c))]
        if not isinstance(cited_laws, list):
            cited_laws = []
        if not isinstance(cited_cases, list):
            cited_cases = []

        explain = state.get("explainability", {})
        await self.judgment_repository.upsert_analysis(
            case_id=case_id,
            draft_text=(state.get("draft_text", "") or reasoning.get("draft_judgment", "") or "").strip(),
            ai_confidence_score=confidence,
            outcome=reasoning.get("outcome"),
            reasoning=str(reasoning_text or "").strip(),
            cited_laws=cited_laws,
            cited_cases=cited_cases,
            law_articles=explain.get("law_articles", []),
            similar_precedents=explain.get("similar_precedents", []),
            entitlement_breakdown=state.get("calculation", {}).get("breakdown", []),
            model_used=state.get("model_used"),
            explainability=explain,
            reasoning_status=reasoning_status or "ok",
        )

        # Always set to READY so the frontend stops polling and shows whatever results were gathered
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

        await self.case_repository.update_status(case_id, CaseStatus.CASE_CLOSED)
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
        outcome_agreement = 1.0 if str(feedback_data.get("outcome", "")).lower() == str(judgment.decision).lower() else 0.0
        await self.evaluation_repository.create_ai_event(
            run_id=run_id,
            case_id=case_id,
            metric_type="outcome_agreement",
            value=outcome_agreement,
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
        
        # Ensure status is finalized when judge provides feedback
        await self.case_repository.update_status(case_id, CaseStatus.CASE_CLOSED)
        
        await self.db.commit()

        return {
            "id": feedback.id,
            "judgment_id": feedback.judgment_id,
            "case_id": feedback.case_id,
            "judge_id": feedback.judge_id,
            "created_at": feedback.created_at,
        }
