import asyncio
import os
import uuid
import logging
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
from app.modules.ingestion.minio_client import upload_file

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

async def seed_judgments(db: AsyncSession, limit: int = None):
    judgment_dir = os.path.join(DATA_ROOT, "Court_Judgments")
    if not os.path.exists(judgment_dir):
        logger.error(f"Judgment directory not found: {judgment_dir}")
        return

    count = 0
    # Process categories
    for folder_name in os.listdir(judgment_dir):
        case_type = FOLDER_TO_CASE_TYPE.get(folder_name)
        if not case_type:
            continue
            
        case_folder = os.path.join(judgment_dir, folder_name)
        if not os.path.isdir(case_folder):
            continue
            
        # Process files in category
        for file_name in os.listdir(case_folder):
            file_name_lower = file_name.lower()
            if not file_name_lower.endswith(".pdf"):
                continue
            
            # Skip Arabic files
            if "arabic" in file_name_lower or "-arb" in file_name_lower or "(arb)" in file_name_lower:
                continue
                
            file_path = os.path.join(case_folder, file_name)
            
            # Skip empty or massive files for stability
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                logger.warning(f"Skipping 0-byte file: {file_name}")
                continue
            if file_size > 10 * 1024 * 1024: # 10MB limit
                logger.warning(f"Skipping large file (>10MB): {file_name}")
                continue
                
            # Check if already exists in DB to skip
            result = await db.execute(select(Document).where(Document.file_name == file_name))
            if result.scalar_one_or_none():
                logger.debug(f"Skipping already processed file: {file_name}")
                continue
                
            await process_file(db, file_path, case_type, DocumentType.COURT_ORDER)
            count += 1
            if limit and count >= limit:
                return

async def seed_laws(db: AsyncSession):
    laws_dir = os.path.join(DATA_ROOT, "Laws", "DIFC Employment Law")
    if not os.path.exists(laws_dir):
        logger.error(f"Laws directory not found: {laws_dir}")
        return

    for file_name in os.listdir(laws_dir):
        if not file_name.endswith(".pdf"):
            continue
        file_path = os.path.join(laws_dir, file_name)
        
        # Skip empty or massive files for stability
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            logger.warning(f"Skipping 0-byte law file: {file_name}")
            continue
        if file_size > 10 * 1024 * 1024:
            logger.warning(f"Skipping large law file (>10MB): {file_name}")
            continue
            
        await process_file(db, file_path, CaseType.OTHER, DocumentType.OTHER)

async def process_file(db: AsyncSession, file_path: str, case_type: CaseType, doc_type: DocumentType):
    file_name = os.path.basename(file_path)
    case_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())
    case_number = f"SEED-{file_name.upper().replace('.PDF', '')}-{str(uuid.uuid4())[:8]}"
    
    logger.info(f"Processing {file_name} as {doc_type}...")

    # 1. Create Case record
    new_case = Case(
        id=case_id,
        case_number=case_number,
        case_type=case_type,
        title=f"Seeded Case: {file_name}",
        status=CaseStatus.CREATED
    )
    db.add(new_case)
    
    # 2. Create Document record
    new_doc = Document(
        id=doc_id,
        case_id=case_id,
        file_name=file_name,
        storage_key=f"seeded/{file_name}",
        mime_type="application/pdf",
        document_type=doc_type,
        processing_status=ProcessingStatus.PENDING
    )
    db.add(new_doc)
    await db.commit()

    # 3. Upload to MinIO
    with open(file_path, "rb") as f:
        data = f.read()
        await upload_file(
            bucket="case-documents",
            key=f"seeded/{file_name}",
            data=data,
            length=len(data),
            content_type="application/pdf"
        )

    # 4. Trigger Ingestion Pipeline
    try:
        await run_ingestion_pipeline(
            document_id=doc_id,
            case_id=case_id,
            storage_key=f"seeded/{file_name}",
            mime_type="application/pdf",
            doc_type=doc_type.value, # Pass string value to pipeline
            db=db
        )
        logger.info(f"Successfully ingested {file_name}")
    except Exception as e:
        logger.error(f"Failed to ingest {file_name}: {e}")

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
