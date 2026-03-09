import asyncio
import os
from contextlib import asynccontextmanager
from typing import List

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


MODEL_NAME = os.getenv("MODEL_NAME", "BAAI/bge-m3")
_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up the model on startup in a thread pool so it doesn't block
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, get_model)
    yield


app = FastAPI(title="BGE-M3 Embedding Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bge_m3", "model": MODEL_NAME}


@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """Generate real BGE-M3 embeddings for the given texts."""
    if not request.texts:
        return EmbedResponse(embeddings=[])

    loop = asyncio.get_event_loop()

    def _encode():
        model = get_model()
        vecs = model.encode(
            request.texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return vecs.tolist()

    try:
        embeddings = await loop.run_in_executor(None, _encode)
        return EmbedResponse(embeddings=embeddings)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}") from exc


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
