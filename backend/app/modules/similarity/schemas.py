from pydantic import BaseModel


class SimilarCase(BaseModel):
    similar_case_id: str
    case_title: str
    outcome: str
    similarity_score: float
    confidence_score: float


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


class PrecedentChatRequest(BaseModel):
    message: str


class PrecedentChatResponse(BaseModel):
    response: str

