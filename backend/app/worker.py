import asyncio
import logging
import traceback
from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.modules.ingestion.models import IngestionJob, JobStatus
from app.modules.ingestion.pipeline import run_ingestion_pipeline

logger = logging.getLogger(__name__)

async def process_jobs():
    """Background worker to poll and process ingestion jobs."""
    logger.info("Starting ingestion worker loop...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # 1. Fetch one PENDING or FAILED (with retry limit) job
                stmt = (
                    select(IngestionJob)
                    .where(IngestionJob.status.in_([JobStatus.PENDING, JobStatus.FAILED]))
                    .where(IngestionJob.attempts < 3)
                    .order_by(IngestionJob.created_at.asc())
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
                result = await db.execute(stmt)
                job = result.scalar_one_or_none()

                if not job:
                    await asyncio.sleep(5)  # Wait for new jobs
                    continue

                # 2. Mark as RUNNING
                job.status = JobStatus.RUNNING
                job.attempts += 1
                await db.commit()
                await db.refresh(job)
                
                logger.info(f"Processing job {job.id} (Attempt {job.attempts})")

                # 3. Run Pipeline
                try:
                    await run_ingestion_pipeline(
                        document_id=str(job.document_id),
                        case_id=str(job.case_id),
                        storage_key=job.storage_key,
                        mime_type=job.mime_type,
                        doc_type=job.doc_type,
                        db=db,
                    )
                    job.status = JobStatus.DONE
                    job.error_message = None
                    logger.info(f"Job {job.id} completed successfully")
                except Exception as e:
                    logger.error(f"Job {job.id} failed: {e}")
                    job.status = JobStatus.FAILED
                    job.error_message = f"{str(e)}\n{traceback.format_exc()}"
                
                await db.commit()

        except Exception as e:
            logger.error(f"Worker error: {e}")
            await asyncio.sleep(10)

if __name__ == "__main__":
    # For running as a standalone process if needed
    asyncio.run(process_jobs())
