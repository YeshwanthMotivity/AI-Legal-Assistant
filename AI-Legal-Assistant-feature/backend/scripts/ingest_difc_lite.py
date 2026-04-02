import os
import io
import uuid
import httpx
import logging
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from neo4j import GraphDatabase
import pytesseract
import fitz # PyMuPDF
from PIL import Image

# Configuration
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
BGE_M3_URL = "http://localhost:8001"
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"

DIFC_BASE_DIR = r"C:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\data\DIFC (Dubai International Financial Centre Court)"

def extract_text(file_path):
    # 1. Try fitz first (fast + robust)
    print(f"  Extracting text from {os.path.basename(file_path)} using fitz...")
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        
        if len(text.strip()) > 300:
            print(f"    Text extraction successful ({len(text)} chars)")
            doc.close()
            return text.strip()
            
        # 2. Fallback to OCR if text is short
        print(f"    Falling back to OCR for {os.path.basename(file_path)}...")
        ocr_text = ""
        for i, page in enumerate(doc):
            pix = page.get_pixmap()
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            lang = "ara+eng" if "arabic" in file_path.lower() or "arb" in file_path.lower() else "eng"
            page_text = pytesseract.image_to_string(image, lang=lang)
            ocr_text += page_text + "\n"
            print(f"      OCR processed page {i+1}/{len(doc)}")
        
        doc.close()
        return ocr_text.strip()
    except Exception as e:
        print(f"    Extraction failed: {e}")
        return ""

def chunk_text(text, chunk_size=700, overlap=100):
    words = text.split()
    chunks = []
    if not words: return []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
        if i + chunk_size >= len(words):
            break
    return chunks

async def get_embeddings(texts):
    if not texts: return []
    print(f"    Embedding {len(texts)} chunks...")
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(f"{BGE_M3_URL}/embed", json={"texts": texts})
            if resp.status_code != 200:
                print(f"      Embedding service error: {resp.status_code} - {resp.text}")
                return []
            data = resp.json()
            embeddings = data.get("embeddings", []) if isinstance(data, dict) else data
            print(f"    Received {len(embeddings)} embeddings.")
            return embeddings
    except Exception as e:
        print(f"    Embedding FAILED: {e}")
        return []

def upsert_to_qdrant(collection_name, points):
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    try:
        client.get_collection(collection_name)
    except:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
    client.upsert(collection_name=collection_name, points=points)

def write_to_neo4j(case_name, language, doc_type, filename):
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        with driver.session() as session:
            session.run(
                "MERGE (c:Case {title: $case_name, language: $language}) "
                "MERGE (d:Document {filename: $filename, type: $doc_type, language: $language}) "
                "MERGE (d)-[:BELONGS_TO]->(c)",
                case_name=case_name, language=language, doc_type=doc_type, filename=filename
            )
        driver.close()
    except Exception as e:
        print(f"    Neo4j error: {e}")

async def process_file(file_path, doc_type, collection_name):
    filename = os.path.basename(file_path)
    print(f"\n[PROCESS] {filename}")
    
    text = extract_text(file_path)
    if not text or len(text) < 50:
        print(f"  !!! Skipping {filename} (No text extracted even with OCR)")
        return False
    
    language = "ar" if "arabic" in filename.lower() or "arb" in filename.lower() or "arabic" in file_path.lower() else "en"
    chunks = chunk_text(text)
    print(f"  Stats: {len(text)} chars, {len(chunks)} chunks, language: {language}")
    
    embeddings = await get_embeddings(chunks)
    if not embeddings:
        print(f"  !!! Skipping {filename} due to embedding failure")
        return False
    
    points = []
    for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{filename}:{i}"))
        points.append(PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "case_id": "difc_seed",
                "case_name": filename.replace(".pdf", ""),
                "filename": filename,
                "raw_text": chunk,
                "language": language,
                "doc_type": doc_type,
                "chunk_index": i
            }
        ))
    
    if points:
        upsert_to_qdrant(collection_name, points)
        write_to_neo4j(filename.replace(".pdf", ""), language, doc_type, filename)
        print(f"  [SUCCESS] Indexed {filename} ({len(points)} points)")
        return True
    return False

async def main():
    print("=== STARTING ROBUST INGESTION ===")
    
    # Precedents
    judgment_dirs = [
        "Court_Judgments",
        os.path.join("Court_Judgments", "Employement contract dispute"),
        os.path.join("Court_Judgments", "End of service benefits"),
        os.path.join("Court_Judgments", "termination-judgement"),
        os.path.join("Court_Judgments", "Unpaid wages"),
        os.path.join("Court_Judgments", "Wrongful termination"),
    ]
    
    # Laws
    law_dirs = [
        "Laws",
        os.path.join("Laws", "ADGM Employment Law"),
        os.path.join("Laws", "DIFC Employment Law"),
        os.path.join("Laws", "Federal Labour Law"),
    ]
    
    success_count = 0
    fail_count = 0
    
    # for d in judgment_dirs:
    #     full_dir = os.path.join(DIFC_BASE_DIR, d)
    #     if not os.path.exists(full_dir): continue
    #     print(f"\n--- Processing Judgments in {d} ---")
    #     for file in os.listdir(full_dir):
    #         if file.lower().endswith(".pdf"):
    #             if await process_file(os.path.join(full_dir, file), "judgment", "difc_precedents"):
    #                 success_count += 1
    #             else:
    #                 fail_count += 1

    for d in law_dirs:
        full_dir = os.path.join(DIFC_BASE_DIR, d)
        if not os.path.exists(full_dir): continue
        print(f"\n--- Processing Laws in {d} ---")
        for file in os.listdir(full_dir):
            if file.lower().endswith(".pdf"):
                if await process_file(os.path.join(full_dir, file), "law", "difc_laws"):
                    success_count += 1
                else:
                    fail_count += 1

    print(f"\n=== INGESTION FINISHED ===")
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
