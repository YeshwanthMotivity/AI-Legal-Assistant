import asyncio
import os
import uuid
import logging
import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.modules.case.models import Case, CaseType, CaseStatus
from app.modules.document.models import Document, DocumentType, ProcessingStatus, ExtractedEntity
from app.modules.user.models import User
from app.modules.audit.models import AuditLog
from app.modules.evaluation.models import EvaluationEvent
# Import judgments if available
try:
    from app.modules.judgment.models import Judgment
    from app.modules.orchestrator.models import JudgeFeedback
except ImportError:
    pass

from app.modules.ingestion.pipeline import run_ingestion_pipeline

import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)
# Mapping directory names to CaseType enum
FOLDER_TO_CASE_TYPE = {
    "Employement contract dispute": CaseType.CONTRACT_DISPUTE,
    "End of service benefits": CaseType.END_OF_SERVICE,
    "Unpaid wages": CaseType.UNPAID_WAGES,
    "Wrongful termination": CaseType.WRONGFUL_TERMINATION,
    "termination-judgement": CaseType.WRONGFUL_TERMINATION,
}

DATA_ROOT = "/app/data/DIFC (Dubai International Financial Centre Court)"

def detect_language(file_name: str) -> str:
    """Simple heuristic to detect language from filename."""
    file_name_lower = file_name.lower()
    if any(tag in file_name_lower for tag in ["arabic", "-arb", "(arb)", "_ar"]):
        return "ar"
    return "en"

async def seed_judgments(db: AsyncSession, limit: int = None):
    judgment_dir = os.path.join(DATA_ROOT, "Court_Judgments")
    if not os.path.exists(judgment_dir):
        logger.error(f"Judgment directory not found: {judgment_dir}")
        return

    count = 0
    # Recursive walk through all folders in Court_Judgments
    for root, dirs, files in os.walk(judgment_dir):
        # Determine case type from folder name in the path
        case_type = CaseType.OTHER
        folder_name = ""
        for folder, ctype in FOLDER_TO_CASE_TYPE.items():
            if folder in root:
                case_type = ctype
                folder_name = folder
                break
        
        for file_name in files:
            if not file_name.lower().endswith(".pdf"):
                continue
                
            file_path = os.path.join(root, file_name)
            file_size = os.path.getsize(file_path)
            if file_size == 0 or file_size > 15 * 1024 * 1024:
                continue
                
            # Extract year from filename if possible
            year_match = re.search(r"(\[| )(20[0-2]\d)(\]|$| )", file_name)
            year = year_match.group(2) if year_match else "Unknown"
            
            language = detect_language(file_name)
            logger.info(f"Seeding judgment: {file_name} [Lang: {language}]")
                
            await process_file(
                db, 
                file_path, 
                case_type, 
                DocumentType.COURT_ORDER, 
                collection_name="difc_precedents",
                extra_metadata={
                    "court": "DIFC Court",
                    "jurisdiction": "DIFC",
                    "year": year,
                    "category": folder_name or "General",
                    "case_name": file_name.replace(".pdf", "").replace(".PDF", ""),
                    "language": language,
                    "source_file": file_name
                }
            )
            count += 1
            if limit and count >= limit:
                return

async def seed_laws(db: AsyncSession):
    laws_dir = os.path.join(DATA_ROOT, "Laws")
    if not os.path.exists(laws_dir):
        logger.error(f"Laws directory not found: {laws_dir}")
        return

    logger.info(f"Scanning laws directory: {laws_dir}")
    for root, dirs, files in os.walk(laws_dir):
        for file_name in files:
            if not file_name.lower().endswith(".pdf"):
                continue
                
            file_path = os.path.join(root, file_name)
            file_size = os.path.getsize(file_path)
            
            if file_size == 0 or file_size > 20 * 1024 * 1024:
                continue

            language = detect_language(file_name)
            law_category = os.path.basename(root)
            
            logger.info(f"Seeding law: {file_name} [Lang: {language}]")
            
            await process_file(
                db, 
                file_path, 
                CaseType.OTHER, 
                DocumentType.OTHER, 
                collection_name="difc_laws",
                extra_metadata={
                    "law_name": file_name.replace(".pdf", "").replace(".PDF", ""),
                    "jurisdiction": "DIFC",
                    "court": "N/A",
                    "language": language,
                    "category": law_category,
                    "source_file": file_name
                }
            )

async def process_file(
    db: AsyncSession, 
    file_path: str, 
    case_type: CaseType, 
    doc_type: DocumentType, 
    collection_name: str = "legal_chunks",
    extra_metadata: dict = None
):
    file_name = os.path.basename(file_path)
    case_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())
    case_number = f"SEED-{file_name.upper().replace('.PDF', '')}-{str(uuid.uuid4())[:8]}"
    
    logger.info(f"Processing {file_name} as {doc_type} in collection {collection_name}...")

    # 1. Create Case record
    new_case = Case(
        id=case_id,
        case_number=case_number,
        case_type=case_type,
        title=f"Seeded Case: {file_name}",
        claimant_name="Seeded Claimant",
        respondent_name="Seeded Respondent",
        description=f"Automated evaluation case for {file_name}.",
        notes="Document uploaded via automated seeder.",
        status=CaseStatus.CREATED
    )
    db.add(new_case)
    
    # 2. Create Document record
    new_doc = Document(
        id=doc_id,
        case_id=case_id,
        file_name=file_name,
        storage_key=file_path,
        mime_type="application/pdf",
        document_type=doc_type,
        processing_status=ProcessingStatus.PENDING
    )
    db.add(new_doc)
    await db.commit()

    # 4. Trigger Ingestion Pipeline
    try:
        await run_ingestion_pipeline(
            document_id=doc_id,
            case_id=case_id,
            storage_key=file_path,
            mime_type="application/pdf",
            doc_type=doc_type.value, # Pass string value to pipeline
            db=db,
            collection_name=collection_name,
            extra_metadata=extra_metadata
        )
        print(f"Successfully ingested {file_name}", flush=True)
    except Exception as e:
        print(f"Failed to ingest {file_name}: {e}", flush=True)

async def main(limit: int = None, seed_all: bool = False):
    async with AsyncSessionLocal() as db:
        if seed_all:
             await seed_laws(db)
        await seed_judgments(db, limit=limit)

if __name__ == "__main__":
    import sys
    limit_arg = int(sys.argv[1]) if len(sys.argv) > 1 else None
    seed_all_arg = "--all" in sys.argv
    asyncio.run(main(limit=limit_arg, seed_all=seed_all_arg))
