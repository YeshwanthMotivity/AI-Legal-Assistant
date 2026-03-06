from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn

app = FastAPI(title="BGE-M3 Embedding Service")


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bge_m3"}


@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """Generate embeddings for the given texts."""
    # Stub implementation - returns dummy embeddings
    # In production, this would load the BGE-M3 model and generate actual embeddings
    dummy_embeddings = [[0.1] * 1024 for _ in request.texts]
    return EmbedResponse(embeddings=dummy_embeddings)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

