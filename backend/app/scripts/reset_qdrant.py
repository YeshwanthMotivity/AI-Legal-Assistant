import sys
import os
import logging
from qdrant_client import QdrantClient

# Ensure app is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Collections to wipe for a clean reset
COLLECTIONS = [
    "difc_precedents",
    "difc_laws",
    "case_summaries",
    "legal_chunks"
]

def reset_qdrant():
    """
    Deletes the specified collections from Qdrant to allow for a clean re-indexing.
    """
    logger.info(f"Connecting to Qdrant at {settings.qdrant_host}:{settings.qdrant_port}...")
    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    
    for collection in COLLECTIONS:
        try:
            logger.info(f"Deleting collection: '{collection}'...")
            client.delete_collection(collection_name=collection)
            logger.info(f"Successfully deleted collection: '{collection}'")
        except Exception as e:
            if "status code 404" in str(e).lower() or "not found" in str(e).lower():
                logger.info(f"Collection '{collection}' does not exist, skipping.")
            else:
                logger.error(f"Failed to delete collection '{collection}': {e}")

    logger.info("Qdrant reset complete. You can now run the re-indexer.")

if __name__ == "__main__":
    reset_qdrant()
