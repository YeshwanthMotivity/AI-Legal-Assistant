"""
Store Initialization Script

This module initializes the data stores (Qdrant, Neo4j, MinIO) on application startup.
"""

import logging
from app.config import settings

logger = logging.getLogger(__name__)


async def init_qdrant():
    """Initialize Qdrant collections."""
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams
        
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        
        collections = client.get_collections().collections
        collection_names = [c.name for c in collections]
        desired_size = settings.embedding_dimension

        def _collection_size(name: str) -> int | None:
            info = client.get_collection(name)
            vectors = info.config.params.vectors
            if hasattr(vectors, "size"):
                return vectors.size
            if isinstance(vectors, dict):
                return vectors.get("size")
            return None

        def _ensure_collection(name: str) -> None:
            if name in collection_names:
                size = _collection_size(name)
                if size != desired_size:
                    client.delete_collection(name)
                else:
                    return
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=desired_size, distance=Distance.COSINE),
            )

        _ensure_collection("legal_chunks")
        _ensure_collection("case_summaries")
        _ensure_collection("difc_precedents")
        _ensure_collection("difc_laws")
        
        logger.info("Qdrant initialization complete")
    except Exception as e:
        logger.warning(f"Qdrant initialization skipped: {e}")



async def init_minio():
    """Initialize MinIO buckets."""
    try:
        from minio import Minio
        from minio.error import S3Error
        
        client = Minio(
            f"{settings.minio_host}:{settings.minio_port}",
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=False
        )
        
        # Create buckets if they don't exist
        buckets = ["case-documents", "ocr-output", "judgment-drafts"]
        
        for bucket in buckets:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
                logger.info(f"Created bucket: {bucket}")
            else:
                logger.info(f"Bucket already exists: {bucket}")
        
        logger.info("MinIO initialization complete")
    except Exception as e:
        logger.warning(f"MinIO initialization skipped: {e}")


async def init_stores():
    """Initialize all data stores."""
    logger.info("Initializing data stores...")
    
    await init_qdrant()

    await init_minio()
    
    logger.info("Data stores initialization complete")

