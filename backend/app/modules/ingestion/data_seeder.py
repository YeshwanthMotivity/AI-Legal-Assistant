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
    "Employment contract dispute": CaseType.CONTRACT_DISPUTE,
    "End of service benefits": CaseType.END_OF_SERVICE,
    "Unpaid wages": CaseType.UNPAID_WAGES,
    "Wrongful termination": CaseType.WRONGFUL_TERMINATION,
    "termination-judgement": CaseType.WRONGFUL_TERMINATION,
}

# Flexibility for local vs container execution
DATA_DIR = os.environ.get("DATA_DIR", "/app/data")
# if /app/data doesn't exist, try local ./data (relative to repo root)
if not os.path.exists(DATA_DIR):
    DATA_DIR = "data"

DATA_ROOT = os.path.join(DATA_DIR, "DIFC (Dubai International Financial Centre Court)")

def detect_language(file_name: str) -> str:
    """Simple heuristic to detect language from filename."""
    file_name_lower = file_name.lower()
    if any(tag in file_name_lower for tag in ["arabic", "-arb", "(arb)", "_ar", " ar", "ar."]):
        return "ar"
    return "en"

async def seed_judgments(db: AsyncSession, limit: int = None, force: bool = False, filter_str: str = None):
    judgment_dir = os.path.join(DATA_ROOT, "Court_Judgments")

    if not os.path.exists(judgment_dir):
        logger.error(f"Judgment directory not found: {judgment_dir}")
        return

    count = 0

    for root, dirs, files in os.walk(judgment_dir):
        # ✅ Get current subfolder name
        folder_name = os.path.basename(root)

        # ✅ Map folder → case type (important)
        case_type = FOLDER_TO_CASE_TYPE.get(folder_name, CaseType.OTHER)

        logger.info(f"Scanning folder: {root}")
        for file_name in files:
            # ✅ Skip others if filter is set
            if filter_str and filter_str not in file_name:
                continue

            if not file_name.lower().endswith(".pdf"):
                continue

            file_path = os.path.join(root, file_name)

            if not os.path.exists(file_path):
                continue

            file_size = os.path.getsize(file_path)
            if file_size == 0 or file_size > 15 * 1024 * 1024:
                continue

            language = detect_language(file_name)

            logger.info(f"Seeding judgment: {file_path} [Lang: {language}]")

            # ✅ Detect court (Lawsuit 6 of 2025 is Dubai Primary Court)
            court_name = "DIFC Court"
            jurisdiction = "DIFC"
            if "Lawsuit_6_2025" in file_name:
                court_name = "Dubai Primary Court"
                jurisdiction = "Dubai"

            await process_file(
                db,
                file_path,
                case_type,
                "court_order",
                collection_name="difc_precedents",
                extra_metadata={
                    "court": court_name,
                    "jurisdiction": jurisdiction,
                    "category": folder_name,
                    "case_name": os.path.splitext(file_name)[0],
                },
                force=force
            )

            count += 1

            if limit and count >= limit:
                return

async def seed_laws(db: AsyncSession, limit: int = None, force: bool = False):
    laws_dir = os.path.join(DATA_ROOT, "Laws")

    if not os.path.exists(laws_dir):
        logger.error(f"Laws directory not found: {laws_dir}")
        return

    count = 0

    for root, dirs, files in os.walk(laws_dir):

        # ✅ Folder = Law Category
        law_category = os.path.basename(root)

        logger.info(f"Scanning law folder: {root}")

        for file_name in files:

            if not file_name.lower().endswith(".pdf"):
                continue

            file_path = os.path.join(root, file_name)

            if not os.path.exists(file_path):
                continue

            file_size = os.path.getsize(file_path)
            if file_size == 0 or file_size > 20 * 1024 * 1024:
                continue

            language = detect_language(file_name)

            logger.info(f"Seeding law: {file_path} [Lang: {language}]")

            await process_file(
                db,
                file_path,
                CaseType.OTHER,
                "law",
                collection_name="difc_laws",
                extra_metadata={
                    "law_name": os.path.splitext(file_name)[0],
                    "category": law_category,
                    "jurisdiction": "UAE/DIFC",
                    "is_law": True,
                },
                force=force
            )

            count += 1

            if limit and count >= limit:
                return

async def process_file(
    db: AsyncSession, 
    file_path: str, 
    case_type: CaseType, 
    doc_type: str, 
    collection_name: str = "legal_chunks",
    extra_metadata: dict = None,
    force: bool = False
):
    file_name = os.path.basename(file_path)

    # Calculate relative path for storage_key (important for pipeline file reading)
    storage_key = os.path.relpath(file_path, DATA_DIR)
    
    # Check if already ingested
    result = await db.execute(select(Document).where(Document.storage_key == storage_key))
    existing = result.scalars().first()
    if existing:
        if not force:
            logger.info(f"Skipping {file_name} — already ingested (use --force to override)")
            return
        else:
            logger.info(f"Force re-ingesting {file_name} — deleting old record...")
            await db.delete(existing)
            case_result = await db.execute(select(Case).where(Case.id == existing.case_id))
            existing_case = case_result.scalars().first()
            if existing_case:
                await db.delete(existing_case)
            await db.commit()

    # Deterministic IDs based on storage key
    doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, storage_key))
    case_folder = os.path.dirname(storage_key)
    case_id = str(uuid.uuid5(uuid.NAMESPACE_URL, case_folder))
    
    # Deterministic case number: prefix + first 16 chars of UUID
    case_number_slug = case_id.split('-')[0].upper()
    case_number = f"SEED-{file_name.upper().replace('.PDF', '')}-{case_number_slug}"
    
    logger.info(f"Processing {file_name} as {doc_type} in collection {collection_name}...")

    # 1. Create Case record if not exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    existing_case = case_result.scalars().first()
    
    if not existing_case:
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
        case_to_update = new_case
    else:
        case_to_update = existing_case
        logger.info(f"Using existing case: {case_to_update.case_number}")
    
    # 2. Create Document record
    new_doc = Document(
        id=doc_id,
        case_id=case_id,
        file_name=file_name,
        storage_key=storage_key,
        mime_type="application/pdf",
        document_type=doc_type.lower() if hasattr(doc_type, "lower") else doc_type, # Sync with lowercase Enum
        processing_status=ProcessingStatus.PENDING
    )
    db.add(new_doc)
    await db.commit()

    # 4. Trigger Ingestion Pipeline
    try:
        result = await run_ingestion_pipeline(
            document_id=doc_id,
            case_id=case_id,
            storage_key=storage_key,
            mime_type="application/pdf",
            doc_type=doc_type.lower() if hasattr(doc_type, "lower") else doc_type, # Pass string value to pipeline
            db=db,
            collection_name=collection_name,
            extra_metadata=extra_metadata
        )
        
        # 5. Enrich Case Metadata with LLM Result
        if result and isinstance(result, dict):
            parties = result.get("parties", {})
            extracted_title = result.get("case_title")
            extracted_claimant = parties.get("claimant")
            extracted_respondent = parties.get("defendant") or parties.get("respondent")
            
            # Re-fetch or use case_to_update? Since we are in the same session, case_to_update is tracked.
            if extracted_title: case_to_update.title = extracted_title
            if extracted_claimant: case_to_update.claimant_name = extracted_claimant
            if extracted_respondent: case_to_update.respondent_name = extracted_respondent
            await db.commit()
            
        print(f"Successfully ingested {file_name}", flush=True)
    except Exception as e:
        print(f"Failed to ingest {file_name}: {e}", flush=True)

async def main(limit: int = None, seed_all: bool = False, force: bool = False, filter_str: str = None):
    async with AsyncSessionLocal() as db:
        if seed_all:
             await seed_laws(db, force=force)
        await seed_judgments(db, limit=limit, force=force, filter_str=filter_str)

if __name__ == "__main__":
    import sys
    limit_arg = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None
    seed_all_arg = "--all" in sys.argv
    force_arg = "--force" in sys.argv
    filter_arg = next((arg.split("=")[1] for arg in sys.argv if arg.startswith("--filter=")), None)
    asyncio.run(main(limit=limit_arg, seed_all=seed_all_arg, force=force_arg, filter_str=filter_arg))
