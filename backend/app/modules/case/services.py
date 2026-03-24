from typing import Optional, List

from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.modules.case.models import CaseStatus
from app.modules.case.schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseListResponse,
    CaseAnalyzeResponse, CaseAnalysisResponse, CaseAnalysisDetail, JudgmentDraftResponse,
    JudgmentResponse, FeedbackResponse
)
from app.modules.case.repository import CaseRepository
from app.modules.evaluation.judgment_repository import JudgmentRepository
from app.modules.orchestrator.services import OrchestratorService


class CaseService:
    def __init__(self, db: AsyncSession, case_repository: CaseRepository):
        self.db = db
        self.case_repository = case_repository
        self.judgment_repository = JudgmentRepository(db)

    @staticmethod
    async def _run_analysis_task(case_id: str) -> None:
        async with AsyncSessionLocal() as task_db:
            try:
                await OrchestratorService(task_db).run_analysis(case_id)
                await task_db.commit()
            except Exception:
                await task_db.rollback()
                raise
    
    async def create_case(self, case_data: CaseCreate, created_by: str) -> CaseResponse:
        """Create a new case."""
        case = await self.case_repository.create(case_data, created_by)
        return CaseResponse.model_validate(case)
    
    async def get_case(self, case_id: str, user_id: str = '', user_role: str = '') -> Optional[CaseResponse]:
        """Get case by ID."""
        case = await self.case_repository.get_by_id(case_id)
        if not case:
            return None

        role = str(user_role).upper()
        if role == 'JUDGE' and case.assigned_to != user_id and case.created_by != user_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail='Forbidden')
            
        return CaseResponse.model_validate(case)
    
    async def get_all_cases(self, user_id: str = '', user_role: str = '', skip: int = 0, limit: int = 100, status: Optional[str] = None) -> CaseListResponse:
        """Get all cases with pagination and scope."""
        role = str(user_role).upper()
        status_enum = self._parse_status(status)
        if role == 'JUDGE':
            cases = await self.case_repository.get_by_judge(user_id, skip, limit)
            total = await self.case_repository.count_by_judge(user_id)
        elif role == 'CLERK':
            cases = await self.case_repository.get_clerk_visible(skip, limit, status_enum)
            total = await self.case_repository.count_clerk_visible(status_enum)
        else:
            # For ADMIN and other roles, exclude seed cases by default
            cases = await self.case_repository.get_all(skip, limit, status_enum, exclude_seed=True)
            total = await self.case_repository.count(status_enum)
            
        return CaseListResponse(
            total=total,
            items=[CaseResponse.model_validate(c) for c in cases]
        )
    
    async def get_user_cases(self, user_id: str, skip: int = 0, limit: int = 100) -> List[CaseResponse]:
        """Get cases assigned to a user."""
        cases = await self.case_repository.get_by_assigned_user(user_id, skip, limit)
        return [CaseResponse.model_validate(c) for c in cases]
    
    async def update_case(self, case_id: str, case_data: CaseUpdate) -> Optional[CaseResponse]:
        """Update case."""
        case = await self.case_repository.update(case_id, case_data)
        if not case:
            return None
        return CaseResponse.model_validate(case)
    
    async def assign_case(self, case_id: str, user_id: str) -> Optional[CaseResponse]:
        """Assign case to a user."""
        case = await self.case_repository.assign(case_id, user_id)
        if not case:
            return None
        return CaseResponse.model_validate(case)
    
    async def analyze_case(self, case_id: str, background_tasks: BackgroundTasks) -> CaseAnalyzeResponse:
        """Queue AI analysis for a case."""
        case = await self.case_repository.update_status(case_id, CaseStatus.AI_ANALYSIS_PENDING)
        if not case:
            return CaseAnalyzeResponse(
                case_id=case_id,
                status="not_found",
            )

        await self.db.commit()
        background_tasks.add_task(self._run_analysis_task, case_id)

        return CaseAnalyzeResponse(
            case_id=case_id,
            status="analysis_pending",
        )
    
    async def get_case_analysis(self, case_id: str) -> CaseAnalysisResponse:
        """Get persisted analysis result by case status."""
        case = await self.case_repository.get_by_id(case_id)
        if not case:
            return CaseAnalysisResponse(
                case_id=case_id,
                analysis=CaseAnalysisDetail(status="not_found"),
            )

        if case.status == CaseStatus.AI_ANALYSIS_PENDING:
            return CaseAnalysisResponse(
                case_id=case_id,
                analysis=CaseAnalysisDetail(status=CaseStatus.AI_ANALYSIS_PENDING.value),
            )

        judgment = await self.judgment_repository.get_by_case_id(case_id)
        if case.status == CaseStatus.AI_ANALYSIS_PENDING and judgment and judgment.reasoning_status == "reasoning_unavailable":
            return CaseAnalysisResponse(
                case_id=case_id,
                analysis=CaseAnalysisDetail(
                    status=CaseStatus.AI_ANALYSIS_PENDING.value,
                    outcome=judgment.decision if judgment else None,
                    reasoning=judgment.reasoning if judgment else None,
                    cited_laws=judgment.articles_cited if judgment and judgment.articles_cited else [],
                    cited_cases=judgment.legal_precedents if judgment and judgment.legal_precedents else [],
                    confidence=judgment.ai_confidence_score if judgment and judgment.ai_confidence_score is not None else 0.85,
                    draft_text=judgment.draft_text if judgment else None,
                    model_used=judgment.model_used if judgment else None,
                    explainability=judgment.explainability if judgment else None,
                ),
            )

        if case.status == CaseStatus.AI_ANALYSIS_READY and judgment:
            explain = judgment.explainability or {}
            return CaseAnalysisResponse(
                case_id=case_id,
                analysis=CaseAnalysisDetail(
                    status=CaseStatus.AI_ANALYSIS_READY.value,
                    outcome=judgment.decision,
                    reasoning=judgment.reasoning,
                    cited_laws=judgment.articles_cited or [],
                    cited_cases=judgment.legal_precedents or [],
                    summary=explain.get("summary"),
                    facts=explain.get("facts") or [],
                    lawArticles=explain.get("law_articles") or [],
                    similarPrecedents=explain.get("similar_precedents") or [],
                    entitlementBreakdown=explain.get("entitlement_breakdown") or [],
                    confidence=judgment.ai_confidence_score if (judgment and judgment.ai_confidence_score is not None) else 0.85,
                    draft_text=judgment.draft_text,
                    model_used=judgment.model_used,
                    explainability=judgment.explainability,
                    reasoning_status=judgment.reasoning_status or "ok",
                ),
            )

        return CaseAnalysisResponse(
            case_id=case_id,
            analysis=CaseAnalysisDetail(status=getattr(case.status, "value", str(case.status))),
        )
    
    async def draft_judgment(self, case_id: str) -> JudgmentDraftResponse:
        """Return persisted AI draft text."""
        judgment = await self.judgment_repository.get_by_case_id(case_id)
        draft_text = judgment.draft_text if judgment and judgment.draft_text else ""
        confidence = judgment.ai_confidence_score if judgment and judgment.ai_confidence_score is not None else 0.85
        return JudgmentDraftResponse(
            case_id=case_id,
            draft_text=draft_text,
            confidence_score=confidence,
        )
    
    async def create_judgment(self, case_id: str, judgment_data: dict, judge_id: str) -> JudgmentResponse:
        """Finalize judgment via orchestrator service."""
        final_text = judgment_data.get("judgment_text", "")
        result = await OrchestratorService(self.db).finalize_judgment(case_id, final_text, judge_id)
        if judgment_data.get("decision") is not None:
            judgment = await self.judgment_repository.get_by_case_id(case_id)
            if judgment:
                judgment.decision = judgment_data.get("decision")
                judgment.compensation_amount = judgment_data.get("compensation_amount")
                judgment.reasoning = judgment_data.get("reasoning")
                judgment.legal_precedents = judgment_data.get("legal_precedents")
                judgment.articles_cited = judgment_data.get("articles_cited")
                await self.db.commit()
                result["decision"] = judgment.decision
                result["compensation_amount"] = judgment.compensation_amount
        if not result.get("decision"):
            result["decision"] = judgment_data.get("decision", "")
        return JudgmentResponse.model_validate(result)
    
    async def submit_feedback(self, case_id: str, feedback_data: dict, judge_id: str) -> FeedbackResponse:
        """Submit feedback through orchestrator service."""
        feedback_result = await OrchestratorService(self.db).record_feedback(case_id, feedback_data, judge_id)
        return FeedbackResponse.model_validate(feedback_result)

    async def delete_case(self, case_id: str) -> bool:
        """Delete case by ID."""
        return await self.case_repository.delete(case_id)

    @staticmethod
    def _parse_status(status: Optional[str]) -> Optional[CaseStatus]:
        if not status:
            return None
        try:
            return CaseStatus(status)
        except ValueError:
            return None
