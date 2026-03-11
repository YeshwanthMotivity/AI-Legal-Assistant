from pydantic import BaseModel, Field, field_validator, field_serializer
from typing import Optional, List, Any
from datetime import datetime
from app.modules.case.models import CaseStatus, CaseType


class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    case_type: CaseType
    claimant_name: Optional[str] = None
    respondent_name: Optional[str] = None
    claim_amount: Optional[str] = None

    @field_validator("case_type", mode="before")
    @classmethod
    def validate_case_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.upper()
        return v

    @field_serializer("case_type")
    def serialize_case_type(self, v: CaseType) -> str:
        return v.value.lower()


class CaseCreate(CaseBase):
    hearing_date: Optional[datetime] = None
    filing_date: Optional[datetime] = None
    court_number: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Unpaid salary dispute",
                "description": "Salary delayed for 3 months",
                "case_type": "unpaid_wages",
                "claimant_name": "John Doe",
                "respondent_name": "ACME LLC",
                "claim_amount": "15000",
                "filing_date": "2026-03-06T00:00:00",
                "hearing_date": "2026-03-20T10:00:00",
                "court_number": "LAB-3",
                "notes": "Urgent hearing requested",
            }
        }


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    claimant_name: Optional[str] = None
    respondent_name: Optional[str] = None
    claim_amount: Optional[str] = None
    hearing_date: Optional[datetime] = None
    filing_date: Optional[datetime] = None
    court_number: Optional[str] = None
    notes: Optional[str] = None


class CaseAssign(BaseModel):
    assigned_to: str


class CaseResponse(CaseBase):
    id: str
    case_number: str
    status: CaseStatus
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None
    filing_date: Optional[datetime] = None
    court_number: Optional[str] = None
    notes: Optional[str] = None
    hearing_date: Optional[datetime] = None
    judgment_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Any:
        if isinstance(v, str):
            # Try to match case-insensitively or just capitalize correctly if it matches a known value
            mapping = {s.value.lower(): s.value for s in CaseStatus}
            return mapping.get(v.lower(), v)
        return v

    @field_serializer("status")
    def serialize_status(self, v: CaseStatus) -> str:
        # Frontend might expect specific casing, like "Created" or "AIAnalysisReady"
        # Since we changed values, let's see if we should return them as is or lowercase
        return v.value

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    total: int
    items: List[CaseResponse]


# Analysis schemas
class CaseAnalyzeRequest(BaseModel):
    document_ids: Optional[List[str]] = None


class CaseAnalyzeResponse(BaseModel):
    case_id: str
    status: str
    extracted_entities: dict = Field(default_factory=dict)
    similar_cases: List[dict] = Field(default_factory=list)
    recommended_articles: List[str] = Field(default_factory=list)


class CaseAnalysisDetail(BaseModel):
    status: str
    outcome: Optional[str] = None
    reasoning: Optional[str] = None
    cited_laws: List[str] = Field(default_factory=list)
    cited_cases: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None
    draft_text: Optional[str] = None
    model_used: Optional[str] = None
    explainability: Optional[dict] = None


class CaseAnalysisResponse(BaseModel):
    case_id: str
    analysis: CaseAnalysisDetail


# Judgment schemas
class JudgmentDraftRequest(BaseModel):
    analysis_id: Optional[str] = None


class JudgmentDraftResponse(BaseModel):
    case_id: str
    draft_text: str
    confidence_score: float


class JudgmentRequest(BaseModel):
    judgment_text: str
    decision: str
    compensation_amount: Optional[str] = None
    reasoning: Optional[str] = None
    legal_precedents: Optional[List[str]] = None
    articles_cited: Optional[List[str]] = None


class JudgmentResponse(BaseModel):
    id: str
    case_id: str
    judge_id: str
    judgment_text: str
    decision: str
    compensation_amount: Optional[str] = None
    is_finalized: bool
    created_at: datetime
    finalized_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Feedback schemas
class FeedbackRequest(BaseModel):
    legal_relevance_score: int
    reasoning_quality_score: int
    explanation_clarity_score: int
    feedback_text: Optional[str] = None
    suggested_improvements: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    judgment_id: str
    case_id: str
    judge_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

