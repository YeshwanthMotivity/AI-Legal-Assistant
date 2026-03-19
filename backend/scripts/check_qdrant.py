from qdrant_client import QdrantClient
import os

client = QdrantClient(host="localhost", port=6333)

DIFC_BASE_DIR = r"C:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\data\DIFC (Dubai International Financial Centre Court)"

# Ground truth count
all_pdfs = []
for root, _, files in os.walk(DIFC_BASE_DIR):
    for file in files:
        if file.lower().endswith(".pdf"):
            all_pdfs.append(file)

print(f"Ground Truth (Total PDFs): {len(all_pdfs)}")

indexed_files = set()
for collection in ["difc_precedents", "difc_laws"]:
    try:
        res, next_page = client.scroll(collection_name=collection, limit=1000, with_payload=True)
        for point in res:
            indexed_files.add(point.payload.get("filename"))
    except Exception as e:
        print(f"Error checking {collection}: {e}")

print(f"Indexed Files in Qdrant: {len(indexed_files)}")
missing = [f for f in all_pdfs if f not in indexed_files]
print(f"Missing: {len(missing)}")
if missing and len(missing) < 20:
    for m in missing:
        print(f"  - {m}")
elif missing:
    print(f"  - First 10 missing: {missing[:10]}")
