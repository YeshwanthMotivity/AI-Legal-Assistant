"""
Benchmark Runner — evaluates vector search quality against the
UAE labour-law benchmark query set using Precision@5, Recall@5, and MRR.

The runner calls the embedding service directly (not the full SearchService
pipeline) to avoid the case_id filter constraint, then queries Qdrant
without a case filter to retrieve globally indexed legal chunks.
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional

import httpx
from qdrant_client import QdrantClient

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.evaluation.benchmark_queries import BENCHMARK_QUERIES
from app.modules.evaluation.repository import EvaluationEventRepository

logger = logging.getLogger(__name__)


class BenchmarkRunner:
    """
    Executes the benchmark query set against the vector store and records
    Precision@5, Recall@5, and MRR as EvaluationEvent rows per query.
    """

    K = 5  # top-k for all retrieval metrics

    def __init__(self, db: AsyncSession):
        self.db = db
        self.eval_repo = EvaluationEventRepository(db)

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    async def run(self, mode: str) -> dict:
        """
        Run the full benchmark and return an aggregated summary dict.

        Args:
            mode: 'dense_baseline' or 'hybrid'

        Returns:
            dict with keys: run_id, run_at, mode, precision_at_5,
                            recall_at_5, mrr, query_count
        """
        run_id = str(uuid.uuid4())
        run_at = datetime.utcnow()

        precision_scores: list[float] = []
        recall_scores: list[float] = []
        mrr_scores: list[float] = []

        for entry in BENCHMARK_QUERIES:
            query_text: str = entry["query_text"]
            relevant_ids: list[str] = entry["relevant_doc_ids"]

            try:
                retrieved_ids = await self._retrieve(query_text, mode)
            except Exception as exc:
                logger.warning("Benchmark query failed, skipping: %s — %s", query_text[:60], exc)
                continue

            p = self._precision_at_k(retrieved_ids, relevant_ids, self.K)
            r = self._recall_at_k(retrieved_ids, relevant_ids, self.K)
            mrr = self._mrr(retrieved_ids, relevant_ids)

            precision_scores.append(p)
            recall_scores.append(r)
            mrr_scores.append(mrr)

            meta = {"run_id": run_id, "mode": mode, "query_text": query_text[:120]}

            await self.eval_repo.create_search_event(
                query_id=run_id, case_id=None, metric_type="precision_at_5", value=p, metadata=meta
            )
            await self.eval_repo.create_search_event(
                query_id=run_id, case_id=None, metric_type="recall_at_5", value=r, metadata=meta
            )
            await self.eval_repo.create_search_event(
                query_id=run_id, case_id=None, metric_type="mrr", value=mrr, metadata=meta
            )

        await self.db.commit()

        query_count = len(precision_scores)

        def _avg(lst: list[float]) -> float:
            return sum(lst) / len(lst) if lst else 0.0

        return {
            "run_id": run_id,
            "run_at": run_at.isoformat(),
            "mode": mode,
            "precision_at_5": round(_avg(precision_scores), 4),
            "recall_at_5": round(_avg(recall_scores), 4),
            "mrr": round(_avg(mrr_scores), 4),
            "query_count": query_count,
        }

    # ------------------------------------------------------------------ #
    #  Retrieval (embedding → Qdrant global search)                       #
    # ------------------------------------------------------------------ #

    async def _retrieve(self, query_text: str, mode: str) -> list[str]:
        """Return list of document_id strings from top-K results."""
        embedding = await self._embed(query_text)
        return await asyncio.get_event_loop().run_in_executor(
            None, lambda: self._qdrant_search(embedding)
        )

    async def _embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.bge_m3_url}/embed",
                json={"texts": [text]},
            )
            resp.raise_for_status()
            data = resp.json()
            embeddings = data.get("embeddings", data) if isinstance(data, dict) else data
            return embeddings[0]

    def _qdrant_search(self, embedding: list[float]) -> list[str]:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)

        if hasattr(client, "search"):
            results = client.search(
                collection_name="legal_chunks",
                query_vector=embedding,
                limit=self.K,
                with_payload=True,
            )
        else:
            r = client.query_points(
                collection_name="legal_chunks",
                query=embedding,
                limit=self.K,
                with_payload=True,
            )
            results = r.points if hasattr(r, "points") else (r.get("points", []) if isinstance(r, dict) else r)

        doc_ids = []
        for point in results:
            payload = point.payload if hasattr(point, "payload") else (point.get("payload", {}) if isinstance(point, dict) else {})
            doc_id = (payload or {}).get("document_id") or (payload or {}).get("doc_id")
            if doc_id:
                doc_ids.append(str(doc_id))
        return doc_ids

    # ------------------------------------------------------------------ #
    #  Metric calculations                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _precision_at_k(retrieved: list[str], relevant: list[str], k: int) -> float:
        if not retrieved:
            return 0.0
        top_k = retrieved[:k]
        hits = sum(1 for r in top_k if r in relevant)
        return hits / k

    @staticmethod
    def _recall_at_k(retrieved: list[str], relevant: list[str], k: int) -> float:
        if not relevant:
            return 0.0
        top_k = retrieved[:k]
        hits = sum(1 for r in top_k if r in relevant)
        return hits / len(relevant)

    @staticmethod
    def _mrr(retrieved: list[str], relevant: list[str]) -> float:
        for i, doc_id in enumerate(retrieved, start=1):
            if doc_id in relevant:
                return 1.0 / i
        return 0.0
