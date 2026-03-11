import asyncio
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from app.config import settings


async def upsert_chunks(
    case_id: str,
    document_id: str,
    doc_type: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadata: list[dict] = None,
) -> None:
    loop = asyncio.get_event_loop()

    def _upsert() -> None:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        points = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}:{idx}"))
            
            payload = {
                "case_id": case_id,
                "document_id": document_id,
                "chunk_index": idx,
                "doc_type": doc_type,
                "raw_text": chunk,
            }
            
            # Merge additional semantic metadata if provided
            if metadata and idx < len(metadata):
                payload.update(metadata[idx])
                
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                )
            )
        if points:
            client.upsert(collection_name="legal_chunks", points=points)

    await loop.run_in_executor(None, _upsert)
