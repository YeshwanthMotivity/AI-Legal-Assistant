import httpx
from app.config import settings


async def embed_chunks(chunks: list[str]) -> list[list[float]]:
    if not chunks:
        return []

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.bge_m3_url}/embed",
            json={"texts": chunks},
        )
        response.raise_for_status()
        data = response.json()

    if isinstance(data, dict):
        embeddings = data.get("embeddings", [])
    else:
        embeddings = data
    return embeddings
