"""Unit tests for BenchmarkRunner — T8."""
from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from app.modules.evaluation.benchmark_runner import BenchmarkRunner


# ── metric calculation unit tests (pure, no DB) ───────────────────────────────

def test_precision_at_k_perfect():
    retrieved = ["a", "b", "c", "d", "e"]
    relevant = ["a", "b", "c"]
    assert BenchmarkRunner._precision_at_k(retrieved, relevant, k=5) == pytest.approx(0.6)


def test_precision_at_k_empty_retrieved():
    assert BenchmarkRunner._precision_at_k([], ["a"], k=5) == 0.0


def test_recall_at_k_perfect():
    retrieved = ["a", "b", "c"]
    relevant = ["a", "b", "c"]
    assert BenchmarkRunner._recall_at_k(retrieved, relevant, k=5) == pytest.approx(1.0)


def test_recall_at_k_none_relevant():
    assert BenchmarkRunner._recall_at_k(["a"], [], k=5) == 0.0


def test_mrr_first_match():
    retrieved = ["x", "a", "b"]
    relevant = ["a"]
    assert BenchmarkRunner._mrr(retrieved, relevant) == pytest.approx(0.5)


def test_mrr_no_match():
    assert BenchmarkRunner._mrr(["x", "y"], ["a", "b"]) == 0.0


def test_mrr_match_at_rank_1():
    assert BenchmarkRunner._mrr(["a", "b"], ["a"]) == pytest.approx(1.0)


# ── run() integration tests (eval_repo patched to avoid ORM mapper) ──────────

@pytest.mark.asyncio
async def test_run_emits_evaluation_events():
    """BenchmarkRunner.run() should persist P@5, R@5, and MRR and return summary."""
    db = AsyncMock()
    db.commit = AsyncMock()

    runner = BenchmarkRunner(db)

    # Fake _retrieve to return the first relevant ID for each query
    async def fake_retrieve(query_text, mode):
        from app.modules.evaluation.benchmark_queries import BENCHMARK_QUERIES
        for entry in BENCHMARK_QUERIES:
            if entry["query_text"] == query_text:
                return entry["relevant_doc_ids"][:1]
        return []

    runner._retrieve = fake_retrieve

    # Patch create_search_event to avoid ORM EvaluationEvent instantiation
    with patch.object(runner.eval_repo, "create_search_event", new=AsyncMock(return_value=None)):
        result = await runner.run("dense_baseline")

    assert result["mode"] == "dense_baseline"
    assert result["query_count"] > 0
    assert 0.0 <= result["precision_at_5"] <= 1.0
    assert 0.0 <= result["recall_at_5"] <= 1.0
    assert 0.0 <= result["mrr"] <= 1.0
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_run_skips_failed_queries_gracefully():
    """Failed individual queries should not abort the whole run."""
    db = AsyncMock()
    db.commit = AsyncMock()

    runner = BenchmarkRunner(db)

    call_count = [0]

    async def flaky_retrieve(query_text, mode):
        call_count[0] += 1
        if call_count[0] % 2 == 0:
            raise RuntimeError("Network error")
        return ["uae-labour-law-art-117"]

    runner._retrieve = flaky_retrieve

    with patch.object(runner.eval_repo, "create_search_event", new=AsyncMock(return_value=None)):
        result = await runner.run("dense_baseline")

    # Should have processed even-numbered queries without raising
    assert isinstance(result["query_count"], int)
    assert result["query_count"] >= 0
