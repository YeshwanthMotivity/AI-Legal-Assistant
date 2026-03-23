from typing import Any, TypedDict


class AnalysisState(TypedDict):
    case_id: str
    entities: list[dict[str, Any]]
    search_results: list[dict[str, Any]] # Uploaded doc chunks
    precedents: list[dict[str, Any]]      # Similar court cases
    laws: list[dict[str, Any]]            # Statutory law articles
    calculation: dict[str, Any]
    context: dict[str, Any]
    reasoning: dict[str, Any]
    reasoning_status: str
    explainability: dict[str, Any]
    draft_text: str
    error: str | None
    model_used: str | None
    query_language: str | None
    query_text: str
    query_embedding: list[float]
    complexity_score: float | None
    db: Any
