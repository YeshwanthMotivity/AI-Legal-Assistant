import time
import os
from qdrant_client import QdrantClient

client = QdrantClient(host="localhost", port=6333)
DIFC_BASE_DIR = r"C:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\data\DIFC (Dubai International Financial Centre Court)"

def get_live_progress():
    # 1. Total Target
    all_pdfs = []
    for root, _, files in os.walk(DIFC_BASE_DIR):
        for file in files:
            if file.lower().endswith(".pdf"):
                all_pdfs.append(file)
    total = len(all_pdfs)

    # 2. Current Progress
    indexed_files = set()
    for collection in ["difc_precedents", "difc_laws"]:
        try:
            res, _ = client.scroll(collection_name=collection, limit=1000, with_payload=True)
            for point in res:
                fname = point.payload.get("filename")
                if fname: indexed_files.add(fname)
        except: pass
    
    indexed_count = len(indexed_files)
    percent = (indexed_count / total) * 100 if total > 0 else 0
    
    os.system('cls' if os.name == 'nt' else 'clear')
    print("="*50)
    print("   DIFC DATASET INGESTION LIVE MONITOR")
    print("="*50)
    print(f"Progress: [{('#' * int(percent // 2)).ljust(50)}] {percent:.1f}%")
    print(f"Total: {total} | Indexed: {indexed_count} | Remaining: {total - indexed_count}")
    print("-" * 50)
    print("Latest Indexed Files:")
    # Show last 5 unique ones
    last_files = sorted(list(indexed_files), key=lambda x: x, reverse=True)[:5]
    for f in last_files:
        print(f"  [x] {f}")
    print("-" * 50)
    print("The ingestion script is running in the background...")
    print("Press Ctrl+C to stop the MONITOR (this won't stop the ingestion).")

if __name__ == "__main__":
    try:
        while True:
            get_live_progress()
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nMonitor stopped.")
