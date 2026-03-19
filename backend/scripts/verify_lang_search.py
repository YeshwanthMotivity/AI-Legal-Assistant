import asyncio
import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

# Mock settings
class settings:
    qdrant_host = "localhost"
    qdrant_port = 6333
    bge_m3_url = "http://localhost:8001"

async def test_search(query_text, lang):
    print(f"\n--- Testing Search (Lang: {lang}) ---")
    
    # 1. Embed
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{settings.bge_m3_url}/embed", json={"texts": [query_text]})
        embeddings = resp.json().get("embeddings", []) if isinstance(resp.json(), dict) else resp.json()
        query_vec = embeddings[0]

    # 2. Search
    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    must = []
    if lang:
        must.append(FieldCondition(key="language", match=MatchValue(value=lang)))
        
    common_filter = Filter(must=must)
    
    result = client.query_points(
        collection_name="difc_precedents",
        query=query_vec,
        query_filter=common_filter,
        limit=5,
        with_payload=True,
    )
    
    points = result.points
    print(f"Found {len(points)} results")
    for p in points:
        payload = p.payload
        print(f"  - [{payload.get('language')}] {payload.get('filename')} (Score: {p.score:.4f})")
        # print(f"    Text: {payload.get('raw_text')[:100]}...")

async def main():
    # Test English
    await test_search("Employment dispute claim", "en")
    
    # Test Arabic
    await test_search("نزاع عقد العمل", "ar")
    
    # Test Mixed (No filter - just for sanity)
    # await test_search("dispute", None)

if __name__ == "__main__":
    asyncio.run(main())
