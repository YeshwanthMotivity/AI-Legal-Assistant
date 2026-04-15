import uuid
import asyncio
import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
import os
import sys

# Add backend to path to import config
sys.path.append(os.path.join(os.getcwd(), "backend"))
from app.config import settings

# Sample text for mock articles to ensure semantic matching
MOCK_ARTICLES = {
    "1": "Definition of wages and basic wage for calculations.",
    "6": "Statute of limitations for labor claims is one year.",
    "8": "Rights and protections for part-time and temporary employees.",
    "9": "Probation period max duration is 6 months.",
    "10": "Non-compete clauses must be specific in time, place, and nature.",
    "30": "Maternity leave entitlement: 60 days (45 full pay, 15 half pay).",
    "60": "Deductions from wages: when an employer is permitted to deduct pay.",
    "61": "Penalties for wage payment delays.",
    "65": "Ramadan working hours are reduced by two hours for all employees.",
    "67": "Overtime calculation for work beyond normal hours.",
    "68": "Maximum overtime hours and compensation rates.",
    "73": "Public holidays entitlement for all employees.",
    "74": "Compensation for working during public holidays.",
    "75": "Annual leave: 30 days for each year after one year of service.",
    "76": "Rules for taking annual leave and notice periods.",
    "82": "Sick leave entitlement and requirements for medical reports.",
    "83": "Sick leave pay: full pay for first 15 days, half for next 30.",
    "117": "Notice period for terminating unlimited contracts (minimum 30 days).",
    "118": "Mandatory adherence to notice periods by both parties.",
    "120": "Grounds for immediate dismissal without notice (limited cases).",
    "122": "Definition of arbitrary or wrongful dismissal.",
    "123": "Compensation for wrongful termination: up to 3 months salary.",
    "125": "Requirement for end-of-service certificate delivery.",
    "129": "Transfer of establishment: rights of employees are preserved.",
    "131": "Employer obligation for repatriation tickets upon termination.",
    "132": "Gratuity calculation: 21 days for first 5 years, 30 days beyond.",
    "134": "Gratuity calculated based on the last basic wage received."
}

COLLECTION_NAME = "difc_laws"

async def get_embedding(text):
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{settings.bge_m3_url}/embed",
            json={"texts": [text]},
        )
        resp.raise_for_status()
        return resp.json()["embeddings"][0]

async def main():
    print(f"Injecting {len(MOCK_ARTICLES)} mock articles into {COLLECTION_NAME}...")
    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    
    # Ensure collection exists
    collections = client.get_collections().collections
    exists = any(c.name == COLLECTION_NAME for c in collections)
    if not exists:
        print(f"Collection {COLLECTION_NAME} not found. Error.")
        return

    points = []
    for art_num, text in MOCK_ARTICLES.items():
        embedding = await get_embedding(text)
        point_id = str(uuid.uuid4())
        
        # Consistent with BenchmarkRunner expectations
        payload = {
            "law_name": "uae-labour-law",
            "article_number": art_num,
            "text": text,
            "raw_text": text,
            "filename": "uae-labour-law.pdf",
            "is_law": True,
            "jurisdiction": "UAE Federal",
            "document_type": "law"
        }
        
        points.append(PointStruct(
            id=point_id,
            vector=embedding,
            payload=payload
        ))
        print(f"  - Generated point for Article {art_num}")

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print("Successfully injected mock benchmark data!")

if __name__ == "__main__":
    asyncio.run(main())
