from qdrant_client import QdrantClient
import os

client = QdrantClient(host="localhost", port=6333)
collection = "difc_laws"

res, next_page = client.scroll(collection_name=collection, limit=1000, with_payload=True)
law_names = set()
for point in res:
    ln = point.payload.get("law_name")
    art = point.payload.get("article_number")
    if ln:
        law_names.add(f"{ln} (art {art})")

print(f"Total points: {len(res)}")
print("Unique Law Names found:")
for name in sorted(list(law_names)):
    print(f"  - {name}")
