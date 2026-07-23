import asyncio
from app.database.base import async_session_maker
from sqlalchemy import select
from app.domains.auth.models import User

async def main():
    async with async_session_maker() as s:
        res = await s.execute(select(User.email, User.is_verified))
        print("Users in database:")
        for row in res.all():
            print(f"- Email: {row[0]}, Verified: {row[1]}")

if __name__ == "__main__":
    asyncio.run(main())
