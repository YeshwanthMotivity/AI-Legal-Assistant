import asyncio
import sys
from sqlalchemy import text

async def test_single():
    from app.database import AsyncSessionLocal
    from app.modules.ingestion.pipeline import run_ingestion_pipeline
    from app.modules.document.models import DocumentType

    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT id, case_id FROM documents WHERE file_name LIKE 'Employment Contract Dispute(2).pdf' LIMIT 1"))
        row = result.fetchone()
        if not row:
            print("No doc found, using first available", flush=True)
            result = await db.execute(text("SELECT id, case_id, file_name, storage_key FROM documents LIMIT 1"))
            row = result.fetchone()
            if not row:
                print("No documents exist in DB", flush=True)
                return
            doc_id, case_id, filename, storage_key = row
        else:
            doc_id = row[0]
            case_id = row[1]
            filename = "Employment Contract Dispute(2).pdf"
            storage_key = "seeded/Employment Contract Dispute(2).pdf"

        print(f"Found doc: {doc_id}, case: {case_id}, file: {filename}", flush=True)
        print(f"Storage key: {storage_key}", flush=True)

        print("Running ingestion pipeline...", flush=True)
        try:
            await run_ingestion_pipeline(
                document_id=doc_id,
                case_id=case_id,
                storage_key=storage_key,
                mime_type="application/pdf",
                doc_type=DocumentType.COURT_ORDER.value,
                db=db,
                collection_name="difc_precedents"
            )
            print("Pipeline completed successfully!", flush=True)
        except Exception as e:
            print(f"Pipeline raised exception: {type(e).__name__}: {e}", flush=True)
            import traceback
            traceback.print_exc()

asyncio.run(test_single())
