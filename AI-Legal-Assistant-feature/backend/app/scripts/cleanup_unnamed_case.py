import asyncio
import logging
import sys
from sqlalchemy import delete
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

# Ensure app is in path
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import AsyncSessionLocal
from app.modules.case.models import Case
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# The specific Unnamed Case ID to delete
CASE_ID = 'c2620394-a5d1-4469-9bce-a4bf6033bb4f'

async def cleanup_case():
    """
    Completely removes a case and all its associated data from:
    1. PostgreSQL (via SQLAlchemy delete)
    2. Qdrant (difc_precedents and case_summaries collections)
    """
    logger.info(f"Starting complete cleanup for Case ID: {CASE_ID}")

    # 1. Delete from PostgreSQL
    try:
        async with AsyncSessionLocal() as db:
            logger.info("Deleting record from PostgreSQL cases table...")
            # Note: If cascading is set up, this will also delete documents, evaluations, etc.
            stmt = delete(Case).where(Case.id == CASE_ID)
            result = await db.execute(stmt)
            await db.commit()
            logger.info(f"PostgreSQL cleanup done (Rows affected: {result.rowcount})")
    except Exception as e:
        logger.error(f"PostgreSQL cleanup failed: {e}")

    # 2. Delete from Qdrant
    try:
        logger.info(f"Connecting to Qdrant at {settings.qdrant_host}:{settings.qdrant_port}...")
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        
        collections = ['difc_precedents', 'case_summaries']
        for collection in collections:
            logger.info(f"Deleting points for Case ID {CASE_ID} from '{collection}'...")
            client.delete(
                collection_name=collection,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="case_id",
                            match=MatchValue(value=CASE_ID)
                        )
                    ]
                )
            )
            logger.info(f"Cleaned collection: {collection}")
            
    except Exception as e:
        logger.error(f"Qdrant cleanup failed: {e}")

    logger.info("Cleanup process finished.")

if __name__ == "__main__":
    asyncio.run(cleanup_case())
