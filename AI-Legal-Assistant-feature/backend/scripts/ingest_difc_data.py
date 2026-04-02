import os
import asyncio
import logging
import uuid
from sqlalchemy import select
from app.config import settings
from app.database import AsyncSessionLocal
from app.modules.ingestion.pipeline import run_ingestion_pipeline
from app.modules.ingestion.minio_client import upload_file

# Import all models to satisfy SQLAlchemy relationships
from app.modules.user import models as user_models
from app.modules.case import models as case_models
from app.modules.document import models as document_models
from app.modules.evaluation import models as evaluation_models
from app.modules.audit import models as audit_models
from app.modules.document.models import Document, DocumentType, ProcessingStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DIFC_BASE_DIR = r"C:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\data\DIFC (Dubai International Financial Centre Court)"

async def ingest_directory(directory, doc_type, collection_name):
    if not os.path.exists(directory):
        logger.warning(f"Directory not found: {directory}")
        return

    async with AsyncSessionLocal() as db:
        for root, _, files in os.walk(directory):
            for file in files:
                if file.lower().endswith(".pdf"):
                    file_path = os.path.join(root, file)
                    logger.info(f"Processing {file_path}")
                    
                    # Detect language based on filename or subdirectory
                    language = "ar" if "arabic" in file.lower() or "arabic" in root.lower() else "en"
                    
                    # Specific case_id for seed data
                    case_id = "difc_seed_data"
                    document_id = str(uuid.uuid4())
                    
                    try:
                        # 1. Store metadata in DB
                        # Map string doc_type to DocumentType enum
                        mapped_doc_type = DocumentType.COURT_ORDER if doc_type == "judgment" else DocumentType.OTHER
                        
                        new_doc = Document(
                            id=document_id,
                            case_id=case_id,
                            file_name=file,
                            storage_key=document_id,
                            mime_type="application/pdf",
                            document_type=mapped_doc_type,
                            processing_status=ProcessingStatus.PENDING
                        )
                        db.add(new_doc)
                        await db.commit()
                        
                        # 2. Upload to MinIO
                        with open(file_path, "rb") as f:
                            data = f.read()
                            await upload_file(
                                bucket="case-documents",
                                key=document_id,
                                data=data,
                                length=len(data),
                                content_type="application/pdf"
                            )
                        
                        # 3. Run Pipeline
                        await run_ingestion_pipeline(
                            document_id=document_id,
                            case_id=case_id,
                            storage_key=document_id,
                            mime_type="application/pdf",
                            doc_type=doc_type,
                            db=db,
                            collection_name=collection_name,
                            language=language
                        )
                        logger.info(f"Successfully ingested {file} [Language: {language}]")
                    except Exception as e:
                        logger.error(f"Failed to ingest {file}: {e}")
                        await db.rollback()

async def main():
    # Judgments Categories
    judgment_categories = [
        "Employement contract dispute",
        "End of service benefits",
        "termination-judgement",
        "Unpaid wages",
        "Wrongful termination"
    ]
    
    # Judgments
    logger.info("Starting Judgments Ingestion...")
    await ingest_directory(os.path.join(DIFC_BASE_DIR, "Court_Judgments"), "judgment", "difc_precedents")
    for cat in judgment_categories:
        await ingest_directory(os.path.join(DIFC_BASE_DIR, "Court_Judgments", cat), "judgment", "difc_precedents")
        
    # Laws Categories
    law_categories = [
        "ADGM Employment Law",
        "DIFC Employment Law",
        "Federal Labour Law"
    ]
    
    # Laws
    logger.info("Starting Laws Ingestion...")
    await ingest_directory(os.path.join(DIFC_BASE_DIR, "Laws"), "law", "difc_laws")
    for cat in law_categories:
        await ingest_directory(os.path.join(DIFC_BASE_DIR, "Laws", cat), "law", "difc_laws")

if __name__ == "__main__":
    asyncio.run(main())
