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
        
        # Create legal_chunks collection (dense-only, vector size = 1024 for BGE-M3)
        collections = client.get_collections().collections
        collection_names = [c.name for c in collections]
        
        if "legal_chunks" not in collection_names:
            client.create_collection(
                collection_name="legal_chunks",
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
            )
            logger.info("Created 'legal_chunks' collection in Qdrant")
        
        # Create case_summaries collection
        if "case_summaries" not in collection_names:
            client.create_collection(
                collection_name="case_summaries",
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
            )
            logger.info("Created 'case_summaries' collection in Qdrant")
        
        logger.info("Qdrant initialization complete")
    except Exception as e:
        logger.warning(f"Qdrant initialization skipped: {e}")


async def init_neo4j():
    """Initialize Neo4j constraints and indexes."""
    try:
        from neo4j import GraphDatabase
        
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        
        with driver.session() as session:
            # Create uniqueness constraints
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Case) REQUIRE c.case_id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.person_id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Company) REQUIRE c.company_id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (l:LawArticle) REQUIRE l.article_id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Evidence) REQUIRE e.evidence_id IS UNIQUE")
            
            # Create indexes
            session.run("CREATE INDEX IF NOT EXISTS FOR (c:Case) ON (c.status)")
            session.run("CREATE INDEX IF NOT EXISTS FOR (c:Case) ON (c.case_type)")
            session.run("CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.name)")
            
        driver.close()
        logger.info("Neo4j initialization complete")
    except Exception as e:
        logger.warning(f"Neo4j initialization skipped: {e}")


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
    await init_neo4j()
    await init_minio()
    
    logger.info("Data stores initialization complete")

