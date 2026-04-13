import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.modules.audit.models import AuditLog

class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(self, user_id: str, action: str, resource_type: str, resource_id: str, metadata: Optional[dict] = None) -> None:
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            audit_log = AuditLog(
                id=str(uuid.uuid4()),
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                extra_metadata=metadata or {},
                created_at=datetime.utcnow()
            )
            session.add(audit_log)
            await session.commit()
