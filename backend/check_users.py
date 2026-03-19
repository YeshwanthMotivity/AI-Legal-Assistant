import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.modules.user.models import User

async def check_users():
    async with AsyncSessionLocal() as session:
        stmt = select(User.username, User.email)
        result = await session.execute(stmt)
        users = result.all()
        print("Users in DB:")
        for u in users:
            print(f"- {u.username} ({u.email})")

if __name__ == "__main__":
    asyncio.run(check_users())
