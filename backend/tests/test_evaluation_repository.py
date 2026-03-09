"""Unit tests for EvaluationEventRepository — T8."""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.evaluation.repository import EvaluationEventRepository


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_execute_result(rows):
    """Return a mock that behaves like a SQLAlchemy execute() result."""
    result = MagicMock()
    result.all.return_value = rows
    result.first.return_value = rows[0] if rows else None
    result.scalar_one.return_value = len(rows)
    return result


def _make_db(rows=None):
    db = AsyncMock()
    db.execute.return_value = _make_execute_result(rows or [])
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    return db


# ── create_event ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_event_with_nullable_case_id():
    """create_event() must NOT raise when case_id is None (benchmark events)."""
    from unittest.mock import patch, MagicMock

    db = AsyncMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    # Patch EvaluationEvent to avoid SQLAlchemy ORM mapper setup in unit tests
    fake_event = MagicMock()
    with patch("app.modules.evaluation.repository.EvaluationEvent") as MockEvent:
        MockEvent.return_value = fake_event
        repo = EvaluationEventRepository(db)
        await repo.create_event(
            metric_type="precision_at_5",
            value=0.8,
            phase="phase_2",
            case_id=None,
            query_id="benchmark-run-001",
            metadata={"run_id": "r1", "mode": "dense_baseline"},
        )

    # Confirm db.add was called with the fake event object
    assert db.add.call_count == 1
    assert db.add.call_args.args[0] is fake_event

    # Confirm EvaluationEvent was constructed with case_id=None and correct metadata
    call_kwargs = MockEvent.call_args.kwargs
    assert call_kwargs.get("case_id") is None
    assert call_kwargs.get("metadata_") == {"run_id": "r1", "mode": "dense_baseline"}
    assert call_kwargs.get("value") == 0.8



# ── phase 1 averages grouped by entity_type ───────────────────────────────────

@pytest.mark.asyncio
async def test_get_phase1_averages_groups_by_entity_type():
    rows = [("PERSON", 0.92), ("ORGANIZATION", 0.87), ("DATE", 0.95)]
    db = _make_db(rows)
    repo = EvaluationEventRepository(db)

    result = await repo.get_phase1_averages()
    assert result == {"PERSON": 0.92, "ORGANIZATION": 0.87, "DATE": 0.95}


@pytest.mark.asyncio
async def test_get_phase1_averages_handles_none_entity_type():
    """None entity_type should be coerced to 'unknown' key."""
    rows = [(None, 0.75)]
    db = _make_db(rows)
    repo = EvaluationEventRepository(db)

    result = await repo.get_phase1_averages()
    assert "unknown" in result
    assert result["unknown"] == 0.75


# ── phase 2 averages (regression) ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_phase2_averages_returns_correct_mapping():
    rows = [("precision_at_5", 0.82), ("recall_at_5", 0.76), ("mrr", 0.91)]
    db = _make_db(rows)
    repo = EvaluationEventRepository(db)

    result = await repo.get_phase2_averages()
    assert result["precision_at_5"] == pytest.approx(0.82)
    assert result["recall_at_5"] == pytest.approx(0.76)
    assert result["mrr"] == pytest.approx(0.91)


@pytest.mark.asyncio
async def test_get_phase2_averages_returns_zero_for_none():
    rows = [("precision_at_5", None)]
    db = _make_db(rows)
    repo = EvaluationEventRepository(db)

    result = await repo.get_phase2_averages()
    assert result["precision_at_5"] == 0.0


# ── time-series ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_time_series_maps_rows_to_dicts():
    now = datetime(2026, 3, 9, 10, 0, 0)
    # For text() queries the result rows behave like tuples: row[0]=bucket, row[1]=value
    db = AsyncMock()
    row = (now, 0.85)
    result_mock = MagicMock()
    result_mock.all.return_value = [row]
    db.execute.return_value = result_mock
    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    repo = EvaluationEventRepository(db)
    result = await repo.get_time_series("precision_at_5", "phase_2", 24)

    assert len(result) == 1
    assert result[0]["value"] == pytest.approx(0.85)
    assert "2026-03-09" in result[0]["bucket"]


@pytest.mark.asyncio
async def test_get_time_series_skips_none_buckets():
    """Rows with a None bucket (un-timestamped) should be filtered out."""
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.all.return_value = [(None, 0.9)]
    db.execute.return_value = result_mock
    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    repo = EvaluationEventRepository(db)
    result = await repo.get_time_series("mrr", "phase_2", 24)

    assert result == []


# ── metrics_summary ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_metrics_summary_filters_by_phase():
    rows = [("mrr", 0.78)]
    db = _make_db(rows)
    repo = EvaluationEventRepository(db)

    result = await repo.get_metrics_summary("phase_2", 24)

    assert db.execute.call_count == 1
    assert result == {"mrr": pytest.approx(0.78)}
