from pydantic import BaseModel


class SearchRequest(BaseModel):
    query_text: str
    case_id: str
    top_k: int = 5


class SearchResult(BaseModel):
    chunk_text: str
    document_id: str
    case_id: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    query_id: str
