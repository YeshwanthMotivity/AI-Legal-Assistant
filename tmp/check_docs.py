import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import AsyncSessionLocal
from app.modules.document.models import Document
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Document).where(Document.file_name.like("%Lawsuit_6_2025%")))
        docs = res.scalars().all()
        if not docs:
            print("No documents found for 'Lawsuit_6_2025'")
        for d in docs:
            print(f"File: {d.file_name}, Status: {d.processing_status}")

if __name__ == "__main__":
    asyncio.run(check())
