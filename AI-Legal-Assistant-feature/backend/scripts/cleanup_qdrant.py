import asyncio
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.modules.case.models import Case
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def cleanup_qdrant():
    # 1. Get all valid case IDs from DB
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Case.id))
        valid_case_ids = set(result.scalars().all())
    
    logger.info(f"Found {len(valid_case_ids)} valid cases in database.")

    # 2. Connect to Qdrant
    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    collections = ["difc_laws", "difc_precedents", "case_summaries"]

    for collection in collections:
        logger.info(f"Cleaning collection: {collection}")
        
        # We need to find points that are NOT in valid_case_ids
        # Qdrant delete supports filters. 
        # Since we can't easily do "NOT IN large_list" in one filter if the list is huge,
        # we can iterate through all points and delete the ones with unknown case_id.
        # Or, we can use the 'title' filter for immediate 'Unnamed Case' removal.
        
        # Priority 1: Delete anything with 'Unnamed Case' title
        try:
            client.delete(
                collection_name=collection,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="case_title",
                            match=MatchValue(value="Unnamed Case")
                        )
                    ]
                )
            )
            client.delete(
                collection_name=collection,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="title",
                            match=MatchValue(value="Unnamed Case")
                        )
                    ]
                )
            )
            logger.info(f"Purged 'Unnamed Case' points from {collection}")
        except Exception as e:
            logger.error(f"Error purging {collection}: {e}")

    logger.info("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup_qdrant())
