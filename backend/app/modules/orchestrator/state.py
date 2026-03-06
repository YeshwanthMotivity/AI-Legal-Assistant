from typing import Any, TypedDict


class AnalysisState(TypedDict):
    case_id: str
    entities: list[dict[str, Any]]
    search_results: list[dict[str, Any]]
    graph_results: dict[str, Any]
    calculation: dict[str, Any]
    context: dict[str, Any]
    reasoning: dict[str, Any]
    reasoning_status: str
    explainability: dict[str, Any]
    draft_text: str
    error: str | None
    model_used: str | None
    db: Any
