from pydantic import BaseModel
from typing import List
from enum import Enum


class GraphQueryIntent(str, Enum):
    FIND_RELEVANT_LAWS = "find_relevant_laws"
    FIND_SIMILAR_COMPANIES = "find_similar_companies"
    FIND_RELATED_CASES = "find_related_cases"


class LawArticleResult(BaseModel):
    article_id: str | None = None
    article_number: str
    title: str | None = None
    full_text: str | None = None


class RelatedCaseResult(BaseModel):
    case_id: str
    title: str
    case_type: str
    outcome: str


class GraphQueryRequest(BaseModel):
    intent: GraphQueryIntent


class GraphQueryResponse(BaseModel):
    case_id: str
    intent: str
    law_articles: List[LawArticleResult]
    related_cases: List[RelatedCaseResult]
    graph_confidence: float


class ReconciliationResponse(BaseModel):
    checked: int
    drift_count: int
    drifted_case_ids: List[str]

