from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ------------------------------------------------------------------ #
#  Metrics query params                                               #
# ------------------------------------------------------------------ #

class MetricsQueryParams(BaseModel):
    metric_type: Optional[str] = None
    phase: Optional[str] = None           # phase_1 | phase_2 | phase_3 | phase_5
    time_window: Optional[int] = Field(default=24, ge=1, le=720)  # hours


# ------------------------------------------------------------------ #
#  Time-series shape                                                  #
# ------------------------------------------------------------------ #

class TimeSeriesPoint(BaseModel):
    bucket: str    # ISO-8601 datetime string
    value: float


class MetricsTimeSeries(BaseModel):
    metric_type: str
    phase: str
    data: list[TimeSeriesPoint] = []
    current_avg: float = 0.0


# ------------------------------------------------------------------ #
#  Main metrics response (backwards-compatible, extended)            #
# ------------------------------------------------------------------ #

class MetricsResponse(BaseModel):
    # Phase 2 — retrieval
    precision_at_5: float = 0.0
    recall_at_5: float = 0.0
    mrr: float = 0.0

    # Phase 3 — case similarity
    top_5_accuracy: float = 0.0
    avg_similarity_score: float = 0.0

    # Phase 4 — graph (kept for backward compat)
    graph_confidence: float = 0.0

    # Phase 1 — entity extraction
    entity_extraction_accuracy: float = 0.0
    entity_extraction_by_type: dict[str, float] = {}

    # Phase 5 — AI orchestrator / judge feedback
    outcome_agreement: float = 0.0
    judge_score: float = 0.0
    search_latency: float = 0.0
    ai_latency: float = 0.0

    # Time-series data for all requested metrics
    time_series: list[MetricsTimeSeries] = []


# ------------------------------------------------------------------ #
#  Benchmark                                                          #
# ------------------------------------------------------------------ #

class BenchmarkRunRequest(BaseModel):
    mode: Literal["dense_baseline", "hybrid"] = "dense_baseline"


class BenchmarkRunResult(BaseModel):
    run_id: str
    run_at: str            # ISO-8601
    mode: str
    precision_at_5: float
    recall_at_5: float
    mrr: float
    query_count: int


# ------------------------------------------------------------------ #
#  Release Gate                                                       #
# ------------------------------------------------------------------ #

class ReleaseGateRequest(BaseModel):
    phase: str
    mode: str
    status: Literal["approved", "deferred"]
    rationale: str
    judge_sign_off: str
    benchmark_run_id: Optional[str] = None


class ReleaseGateResponse(BaseModel):
    id: str
    phase: str
    mode: str
    status: str
    rationale: Optional[str] = None
    judge_sign_off: Optional[str] = None
    decided_at: Optional[datetime] = None
    benchmark_run_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ------------------------------------------------------------------ #
#  Judge Feedback                                                     #
# ------------------------------------------------------------------ #

class JudgeFeedbackCreate(BaseModel):
    judgment_id: str
    legal_relevance_score: float = Field(..., ge=1, le=5)
    reasoning_quality_score: float = Field(..., ge=1, le=5)
    explanation_clarity_score: float = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = None
    suggested_improvements: Optional[str] = None


class JudgeFeedbackResponse(BaseModel):
    id: str
    case_id: str
    judgment_id: str
    judge_id: str
    legal_relevance_score: float
    reasoning_quality_score: float
    explanation_clarity_score: float
    feedback_text: Optional[str] = None
    suggested_improvements: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ------------------------------------------------------------------ #
#  Legacy (kept for backward compat with other modules)              #
# ------------------------------------------------------------------ #

class EvaluationBase(BaseModel):
    pass
