import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from app.config import settings

def reset_qdrant():
    host = "localhost"
    try:
        client = QdrantClient(host=host, port=6333)
        client.get_collections()
    except Exception as e:
        print(f"Cannot connect to localhost, trying original host: {settings.qdrant_host}")
        host = settings.qdrant_host
        client = QdrantClient(host=host, port=settings.qdrant_port)

    print(f"Connecting to Qdrant at {host}...")
    cols = ["legal_chunks", "case_summaries", "difc_precedents", "difc_laws"]
    
    for c in cols:
        try:
            client.delete_collection(c)
            print(f"Deleted collection: {c}")
        except Exception as e:
            print(f"Error deleting {c} (might not exist): {e}")
            
    desired_size = settings.embedding_dimension
    print(f"Creating collections with dimension: {desired_size}")
    
    for c in cols:
        try:
            client.create_collection(
                collection_name=c,
                vectors_config=VectorParams(size=desired_size, distance=Distance.COSINE),
            )
            print(f"Created collection: {c}")
        except Exception as e:
            print(f"Error creating {c}: {e}")

if __name__ == "__main__":
    reset_qdrant()
