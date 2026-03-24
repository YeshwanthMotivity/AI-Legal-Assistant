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

DATA_ROOT = "/app/data/DIFC (Dubai International Financial Centre Court)"

def detect_language(file_name: str) -> str:
    """Simple heuristic to detect language from filename."""
    file_name_lower = file_name.lower()
    if any(tag in file_name_lower for tag in ["arabic", "-arb", "(arb)", "_ar", " ar", "ar."]):
        return "ar"
    return "en"

async def seed_judgments(db: AsyncSession, limit: int = None, force: bool = False):
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

            await process_file(
                db,
                file_path,
                case_type,
                DocumentType.COURT_ORDER,
                collection_name="difc_precedents",
                extra_metadata={
                    "court": "DIFC Court",
                    "jurisdiction": "DIFC",
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
                DocumentType.LAW,
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
    doc_type: DocumentType, 
    collection_name: str = "legal_chunks",
    extra_metadata: dict = None,
    force: bool = False
):
    file_name = os.path.basename(file_path)

    # Check if already ingested
    from app.modules.document.models import Document
    result = await db.execute(select(Document).where(Document.storage_key == file_path))
    existing = result.scalars().first()
    if existing:
        if not force:
            logger.info(f"Skipping {file_path} — already ingested (use --force to override)")
            return
        else:
            logger.info(f"Force re-ingesting {file_path} — deleting old record...")
            # Delete the existing document and case to avoid conflicts
            # Note: In a production app you'd be more careful, but for a seeder this is fine.
            await db.delete(existing)
            # Find and delete the case if it was a seeded case
            from app.modules.case.models import Case
            case_result = await db.execute(select(Case).where(Case.id == existing.case_id))
            existing_case = case_result.scalars().first()
            if existing_case:
                await db.delete(existing_case)
            await db.commit()

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
        document_type=doc_type.value if hasattr(doc_type, 'value') else doc_type,
        processing_status=ProcessingStatus.PENDING
    )
    db.add(new_doc)
    await db.commit()

    # 4. Trigger Ingestion Pipeline
    try:
        result = await run_ingestion_pipeline(
            document_id=doc_id,
            case_id=case_id,
            storage_key=file_path,
            mime_type="application/pdf",
            doc_type=doc_type.value if hasattr(doc_type, 'value') else doc_type, # Pass string value to pipeline
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
            
            # Re-fetch or use new_case? Since we are in the same session, new_case is tracked.
            if extracted_title: new_case.title = extracted_title
            if extracted_claimant: new_case.claimant_name = extracted_claimant
            if extracted_respondent: new_case.respondent_name = extracted_respondent
            await db.commit()
            
        print(f"Successfully ingested {file_name}", flush=True)
    except Exception as e:
        print(f"Failed to ingest {file_name}: {e}", flush=True)

async def main(limit: int = None, seed_all: bool = False, force: bool = False):
    async with AsyncSessionLocal() as db:
        if seed_all:
             await seed_laws(db, force=force)
        await seed_judgments(db, limit=limit, force=force)

if __name__ == "__main__":
    import sys
    limit_arg = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None
    seed_all_arg = "--all" in sys.argv
    force_arg = "--force" in sys.argv
    asyncio.run(main(limit=limit_arg, seed_all=seed_all_arg, force=force_arg))
