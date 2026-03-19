
import asyncio
from app.database import AsyncSessionLocal
from app.modules.user.models import User
from app.modules.case.models import Case
from app.modules.document.models import Document, ExtractedEntity
from app.modules.evaluation.models import Judgment, JudgeFeedback
from app.modules.audit.models import AuditLog
from app.modules.orchestrator.services import OrchestratorService

async def trigger():
    case_id = "ba96c38c-ea3c-409e-a0ad-4678f5b9d54f"
    async with AsyncSessionLocal() as db:
        print(f"Triggering analysis for {case_id}...")
        service = OrchestratorService(db)
        await service.run_analysis(case_id)
        print("Analysis completed.")

if __name__ == "__main__":
    asyncio.run(trigger())
