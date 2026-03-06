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
    similar_cases: list[SimilarCase]
    run_id: str

