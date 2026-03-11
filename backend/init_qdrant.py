from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_collections():
    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    collections = ["difc_laws", "difc_precedents", "legal_chunks"]
    
    for coll in collections:
        try:
            client.get_collection(coll)
            logger.info(f"Collection {coll} already exists.")
        except Exception:
            logger.info(f"Creating collection {coll}...")
            client.create_collection(
                collection_name=coll,
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
            )
            logger.info(f"Collection {coll} created.")

if __name__ == "__main__":
    init_collections()
