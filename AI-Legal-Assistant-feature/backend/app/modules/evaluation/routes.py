from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.rbac import require_role, UserRole
from app.modules.evaluation.schemas import (
    MetricsResponse,
    MetricsTimeSeries,
    TimeSeriesPoint,
    BenchmarkRunRequest,
    BenchmarkRunResult,
    ReleaseGateRequest,
    ReleaseGateResponse,
)
from app.modules.evaluation.repository import EvaluationEventRepository
from app.modules.evaluation.release_gate_repository import ReleaseGateRepository
from app.modules.evaluation.benchmark_runner import BenchmarkRunner

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Evaluation"])

# ------------------------------------------------------------------ #
#  Metric constants                                                   #
# ------------------------------------------------------------------ #

PHASE_METRICS: dict[str, list[str]] = {
    "phase_1": ["entity_extraction_accuracy"],
    "phase_2": ["precision_at_5", "recall_at_5", "mrr"],
    "phase_3": ["top_5_accuracy", "avg_similarity_score"],
    "phase_5": ["outcome_agreement", "judge_score", "search_latency", "ai_latency"],
}

ALL_PHASES = list(PHASE_METRICS.keys())


# ------------------------------------------------------------------ #
#  GET /admin/metrics                                                  #
# ------------------------------------------------------------------ #

@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    metric_type: Optional[str] = None,
    phase: Optional[str] = None,
    time_window: int = 24,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """
    Returns scalar KPI averages plus optional time-series data.

    Query params:
      - metric_type: filter to a single metric (optional)
      - phase:       filter to a single phase (optional)
      - time_window: trailing window in hours for time-series (default 24)
    """
    repo = EvaluationEventRepository(db)

    # --- Scalar averages (all-time, used for the overview tiles) ---
    phase1 = await repo.get_phase1_averages()
    phase2 = await repo.get_phase2_averages()
    phase3 = await repo.get_phase3_averages()
    phase4 = await repo.get_phase4_averages()
    phase5 = await repo.get_phase5_averages()

    # Overall entity extraction accuracy (average across entity types)
    entity_vals = list(phase1.values())
    entity_accuracy = sum(entity_vals) / len(entity_vals) if entity_vals else 0.0

    # Judge composite score
    judge_components = [
        phase5.get("legal_relevance_score", 0.0),
        phase5.get("reasoning_quality_score", 0.0),
        phase5.get("explanation_clarity_score", 0.0),
    ]
    judge_score = sum(c for c in judge_components if c) / max(
        sum(1 for c in judge_components if c), 1
    )

    # --- Time-series (filtered by phase / metric_type) ---
    target_phases = [phase] if phase else ALL_PHASES
    time_series_out: list[MetricsTimeSeries] = []

    for p in target_phases:
        metrics_to_fetch = (
            [metric_type] if metric_type
            else PHASE_METRICS.get(p, [])
        )
        for mt in metrics_to_fetch:
            ts_data = await repo.get_time_series(mt, p, time_window)
            avg_summary = await repo.get_metrics_summary(p, time_window)
            time_series_out.append(
                MetricsTimeSeries(
                    metric_type=mt,
                    phase=p,
                    data=[TimeSeriesPoint(**pt) for pt in ts_data],
                    current_avg=avg_summary.get(mt, 0.0),
                )
            )

    return MetricsResponse(
        precision_at_5=phase2.get("precision_at_5", 0.0),
        recall_at_5=phase2.get("recall_at_5", 0.0),
        mrr=phase2.get("mrr", 0.0),
        top_5_accuracy=phase3.get("top_5_accuracy", 0.0),
        avg_similarity_score=phase3.get("avg_similarity_score", 0.0),
        graph_confidence=phase4.get("graph_confidence", 0.0),
        entity_extraction_accuracy=entity_accuracy,
        entity_extraction_by_type=phase1,
        outcome_agreement=phase5.get("outcome_agreement", 0.0),
        judge_score=judge_score,
        search_latency=phase5.get("search_latency", 0.0),
        ai_latency=phase5.get("ai_latency", 0.0),
        time_series=time_series_out,
    )


# ------------------------------------------------------------------ #
#  Benchmark endpoints                                                #
# ------------------------------------------------------------------ #

@router.post("/benchmark/run", response_model=BenchmarkRunResult, status_code=status.HTTP_200_OK)
async def run_benchmark(
    payload: BenchmarkRunRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Trigger a benchmark run against the UAE labour-law query set."""
    runner = BenchmarkRunner(db)
    try:
        result = await runner.run(mode=payload.mode)
    except Exception as exc:
        logger.exception("Benchmark run failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Benchmark run failed: {exc}",
        ) from exc
    return BenchmarkRunResult(**result)


@router.get("/benchmark/latest", response_model=BenchmarkRunResult)
async def get_latest_benchmark(
    mode: str = "dense_baseline",
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Return the most recent benchmark run summary for a given mode."""
    repo = EvaluationEventRepository(db)
    run_id = await repo.get_latest_benchmark_run_id(mode)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No benchmark runs found for mode '{mode}'",
        )
    averages = await repo.get_benchmark_averages(run_id)
    count = await repo.get_benchmark_query_count(run_id)
    return BenchmarkRunResult(
        run_id=run_id,
        run_at="",   # run_at not stored separately; kept for schema compat
        mode=mode,
        precision_at_5=averages.get("precision_at_5", 0.0),
        recall_at_5=averages.get("recall_at_5", 0.0),
        mrr=averages.get("mrr", 0.0),
        query_count=count,
    )


# ------------------------------------------------------------------ #
#  Release Gate endpoints                                             #
# ------------------------------------------------------------------ #

@router.get("/release-gate", response_model=list[ReleaseGateResponse])
async def list_release_gates(
    phase: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """List all gate decisions, optionally filtered by phase."""
    gate_repo = ReleaseGateRepository(db)
    gates = await gate_repo.list_gates(phase=phase)
    return [ReleaseGateResponse.model_validate(g) for g in gates]


@router.post("/release-gate", response_model=ReleaseGateResponse, status_code=status.HTTP_201_CREATED)
async def create_release_gate(
    payload: ReleaseGateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Record a gate decision (approved / deferred) with judge sign-off."""
    gate_repo = ReleaseGateRepository(db)
    gate = await gate_repo.create_gate(
        phase=payload.phase,
        mode=payload.mode,
        status=payload.status,
        rationale=payload.rationale,
        judge_sign_off=payload.judge_sign_off,
        decided_by=current_user.get("id"),
        benchmark_run_id=payload.benchmark_run_id,
    )
    await db.commit()
    await db.refresh(gate)
    return ReleaseGateResponse.model_validate(gate)
