import asyncio
import os
import sys
import logging
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Add the project root to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database import SessionLocal
from app.modules.case.models import Case
from app.modules.similarity.services import SimilarityService
from app.modules.evaluation.models import EvaluationEvent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def populate_metrics():
    logger.info("Starting Similarity Metrics population...")
    
    async with SessionLocal() as session:
        # 1. Get a subset of cases to run similarity on
        res = await session.execute(select(Case.id).limit(20))
        case_ids = [r[0] for r in res.all()]
        
        if not case_ids:
            logger.warning("No cases found in database to process.")
            return

        similarity_service = SimilarityService(session)
        
        processed_count = 0
        for cid in case_ids:
            try:
                logger.info(f"Processing similarity for case: {cid}")
                # find_similar internally calls evaluation_repository.create_similarity_event
                await similarity_service.find_similar(cid)
                processed_count += 1
            except Exception as e:
                logger.error(f"Failed to process case {cid}: {e}")
        
        await session.commit()
        logger.info(f"Successfully processed {processed_count} cases.")

if __name__ == "__main__":
    asyncio.run(populate_metrics())
