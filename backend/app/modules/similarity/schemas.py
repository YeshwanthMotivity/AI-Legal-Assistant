from pydantic import BaseModel


class SimilarCase(BaseModel):
    similar_case_id: str
    case_title: str
    outcome: str
    similarity_score: float
    confidence_score: float
    claimant: str | None = None
    respondent: str | None = None
    summary: str | None = None


class SimilarityRequest(BaseModel):
    case_id: str


class SimilarityResponse(BaseModel):
    case_id: str
class PrecedentDetail(BaseModel):
    id: str
    title: str
    year: str | None = None
    category: str | None = None
    text: str
    outcome: str | None = None
    case_type: str | None = None
    summary: str | None = None
    cited_laws: list[str] = []
    compensation: str | None = None
    claimant: str | None = None
    respondent: str | None = None


class PrecedentChatRequest(BaseModel):
    message: str
    language: str = "en"


class PrecedentChatResponse(BaseModel):
    response: str

