from qdrant_client import QdrantClient, AsyncQdrantClient
from app.config import settings

_qdrant_client: QdrantClient | None = None
_async_qdrant_client: AsyncQdrantClient | None = None

def get_qdrant_client() -> QdrantClient:
    """Return the process-wide synchronous QdrantClient singleton."""
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port
        )
    return _qdrant_client

def get_async_qdrant_client() -> AsyncQdrantClient:
    """Return the process-wide async QdrantClient singleton.

    NOTE: Unlike the sync client, the async client manages its own
    internal httpx session. Do NOT call `await client.close()` — the
    singleton is shared across the entire process lifetime.
    """
    global _async_qdrant_client
    if _async_qdrant_client is None:
        _async_qdrant_client = AsyncQdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port
        )
    return _async_qdrant_client
