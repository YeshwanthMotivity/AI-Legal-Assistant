import asyncio
import sys
import os

# Add current directory to path to import app
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.modules.user.models import User

async def check_users():
    try:
        async with AsyncSessionLocal() as s:
            res = await s.execute(select(User.id, User.username, User.keycloak_id))
            users = res.all()
            print("Users in DB (ID, Username, Keycloak ID):")
            for u in users:
                print(u)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_users())
