
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def reset_case_status():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT id FROM cases WHERE case_number LIKE '%9e669f63'"))
        row = result.fetchone()
        if not row:
            print("Case not found")
            return
        
        case_id = row[0]
        print(f"Resetting case {case_id}...")
        
        # Reset case status - using exact enum value
        await db.execute(text("UPDATE cases SET status = 'DocumentsUploaded' WHERE id = :id"), {"id": case_id})
        
        # Reset reasoning status if it exists
        await db.execute(text("UPDATE judgments SET reasoning_status = 'ok' WHERE case_id = :id"), {"id": case_id})
        
        await db.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(reset_case_status())
