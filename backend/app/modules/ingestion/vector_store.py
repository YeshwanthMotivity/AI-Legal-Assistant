import asyncio
import uuid
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from app.config import settings

logger = logging.getLogger(__name__)


async def upsert_chunks(
    case_id: str,
    document_id: str,
    doc_type: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadata: list[dict] = None,
    collection_name: str = "legal_chunks",
) -> None:
    logger.info(f"upsert_chunks called for case {case_id}, doc {document_id} with {len(chunks)} chunks and {len(embeddings)} embeddings")
    loop = asyncio.get_event_loop()

    def _upsert() -> None:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        points = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}:{idx}"))
            
            # Get language from metadata if available, otherwise default to "en"
            chunk_lang = "en"
            if metadata and idx < len(metadata):
                chunk_lang = metadata[idx].get("language", "en")

            payload = {
                "case_id": case_id,
                "document_id": document_id,
                "chunk_index": idx,
                "doc_type": doc_type,
                "raw_text": chunk,
                "language": chunk_lang,
            }
            
            # Merge additional semantic metadata if provided
            if metadata and idx < len(metadata):
                payload.update(metadata[idx])
            
            # Force raw_text and case_id to be correct just in case metadata has collisions
            payload["raw_text"] = chunk
            payload["case_id"] = case_id
            if "language" in payload and not payload["language"]:
                 payload["language"] = "en"
                
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                )
            )
        if points:
            logger.info(f"Upserting {len(points)} points to collection '{collection_name}' for case {case_id}")
            try:
                client.upsert(collection_name=collection_name, points=points)
                logger.info(f"Successfully upserted points to '{collection_name}'")
            except Exception as e:
                logger.error(f"Failed to upsert to Qdrant collection '{collection_name}': {e}")
                raise

    await loop.run_in_executor(None, _upsert)
