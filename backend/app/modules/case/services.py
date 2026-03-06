from typing import Optional, List
from app.modules.case.schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseListResponse,
    CaseAnalyzeResponse, CaseAnalysisResponse, JudgmentDraftResponse,
    JudgmentResponse, FeedbackResponse
)
from app.modules.case.repository import CaseRepository


class CaseService:
    def __init__(self, case_repository: CaseRepository):
        self.case_repository = case_repository
    
    async def create_case(self, case_data: CaseCreate, created_by: str) -> CaseResponse:
        """Create a new case."""
        case = await self.case_repository.create(case_data, created_by)
        return CaseResponse.model_validate(case)
    
    async def get_case(self, case_id: str) -> Optional[CaseResponse]:
        """Get case by ID."""
        case = await self.case_repository.get_by_id(case_id)
        if not case:
            return None
        return CaseResponse.model_validate(case)
    
    async def get_all_cases(self, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> CaseListResponse:
        """Get all cases with pagination."""
        cases = await self.case_repository.get_all(skip, limit)
        total = await self.case_repository.count()
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
    
    async def analyze_case(self, case_id: str) -> CaseAnalyzeResponse:
        """Analyze case (stub - no business logic)."""
        return CaseAnalyzeResponse(
            case_id=case_id,
            status="analysis_complete",
            extracted_entities={
                "employee_name": "John Doe",
                "employer_name": "ABC Corporation",
                "salary": "5000 AED",
                "employment_start": "2020-01-01",
                "termination_reason": "Resignation"
            },
            similar_cases=[
                {"case_number": "CASE-20240101-001", "similarity": 0.85},
                {"case_number": "CASE-20240101-002", "similarity": 0.72}
            ],
            recommended_articles=["Article 132", "Article 145"]
        )
    
    async def get_case_analysis(self, case_id: str) -> CaseAnalysisResponse:
        """Get case analysis (stub)."""
        return CaseAnalysisResponse(
            case_id=case_id,
            analysis={
                "summary": "Case analysis pending AI processing",
                "key_issues": ["Unpaid wages", "Wrongful termination"],
                "recommendations": ["Review employment contract", "Check salary records"]
            }
        )
    
    async def draft_judgment(self, case_id: str) -> JudgmentDraftResponse:
        """Generate judgment draft (stub)."""
        return JudgmentDraftResponse(
            case_id=case_id,
            draft_text="This is a stub judgment draft. In production, the AI would generate the actual judgment based on case analysis.",
            confidence_score=0.82
        )
    
    async def create_judgment(self, case_id: str, judgment_data: dict, judge_id: str) -> JudgmentResponse:
        """Create judgment (stub)."""
        from app.modules.evaluation.models import Judgment
        import uuid
        
        judgment = Judgment(
            id=str(uuid.uuid4()),
            case_id=case_id,
            judge_id=judge_id,
            judgment_text=judgment_data.get("judgment_text", ""),
            decision=judgment_data.get("decision", ""),
            compensation_amount=judgment_data.get("compensation_amount"),
            reasoning=judgment_data.get("reasoning"),
            legal_precedents=judgment_data.get("legal_precedents"),
            articles_cited=judgment_data.get("articles_cited"),
            is_final="true"
        )
        return JudgmentResponse.model_validate(judgment)
    
    async def submit_feedback(self, case_id: str, feedback_data: dict, judge_id: str) -> FeedbackResponse:
        """Submit judge feedback (stub)."""
        from app.modules.evaluation.models import JudgeFeedback
        import uuid
        
        feedback = JudgeFeedback(
            id=str(uuid.uuid4()),
            case_id=case_id,
            judge_id=judge_id,
            legal_relevance_score=str(feedback_data.get("legal_relevance_score", 0)),
            reasoning_quality_score=str(feedback_data.get("reasoning_quality_score", 0)),
            explanation_clarity_score=str(feedback_data.get("explanation_clarity_score", 0)),
            feedback_text=feedback_data.get("feedback_text"),
            suggested_improvements=feedback_data.get("suggested_improvements")
        )
        return FeedbackResponse.model_validate(feedback)

