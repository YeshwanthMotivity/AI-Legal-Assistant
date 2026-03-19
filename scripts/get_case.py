import sys
import os
sys.path.insert(0, os.getcwd())

import asyncio
from app.db.session import SessionLocal
from sqlalchemy import text

async def get_test_case():
    async with SessionLocal() as db:
        result = await db.execute(text("SELECT id FROM cases LIMIT 1"))
        case_id = result.scalar()
        print(f"TEST_CASE_ID:{case_id}")

if __name__ == "__main__":
    asyncio.run(get_test_case())
