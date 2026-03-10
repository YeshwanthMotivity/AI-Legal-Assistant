import asyncio
import os
from contextlib import asynccontextmanager
from typing import List

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
_reranker = None


def get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder(RERANKER_MODEL, max_length=512)
    return _reranker


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, get_reranker)
    yield


app = FastAPI(title="BGE Reranker Service", lifespan=lifespan)


class RerankRequest(BaseModel):
    query: str
    passages: List[str]


class RerankResponse(BaseModel):
    results: List[dict]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bge_reranker", "model": RERANKER_MODEL}


@app.post("/rerank", response_model=RerankResponse)
async def rerank_passages(request: RerankRequest):
    """Rerank passages by semantic relevance using BGE cross-encoder."""
    if not request.passages:
        return RerankResponse(results=[])

    loop = asyncio.get_event_loop()

    def _score():
        reranker = get_reranker()
        pairs = [[request.query, p] for p in request.passages]
        raw_scores = reranker.predict(pairs)
        # raw_scores is a numpy array — convert to list of floats
        scores = [float(s) for s in raw_scores]
        results = [
            {"index": i, "text": request.passages[i], "score": scores[i]}
            for i in range(len(request.passages))
        ]
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    try:
        results = await loop.run_in_executor(None, _score)
        return RerankResponse(results=results)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reranking failed: {exc}") from exc


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
