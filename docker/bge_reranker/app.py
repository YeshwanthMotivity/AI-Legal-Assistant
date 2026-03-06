from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn

app = FastAPI(title="BGE Reranker Service")


class RerankRequest(BaseModel):
    query: str
    passages: List[str]


class RerankResponse(BaseModel):
    results: List[dict]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bge_reranker"}


@app.post("/rerank", response_model=RerankResponse)
async def rerank_passages(request: RerankRequest):
    """Rerank passages based on relevance to the query."""
    # Stub implementation - returns dummy scores
    # In production, this would load the BGE reranker model and generate actual scores
    results = [
        {"text": passage, "score": 0.9 - (i * 0.1)}
        for i, passage in enumerate(request.passages)
    ]
    return RerankResponse(results=results)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)

