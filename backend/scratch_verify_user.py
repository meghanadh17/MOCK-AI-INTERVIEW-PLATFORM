import asyncio
from app.database.base import async_session_maker
from sqlalchemy import select
from app.domains.auth.models import User
from app.core.security import get_password_hash

async def main():
    async with async_session_maker() as s:
        res = await s.execute(select(User).where(User.email == "testuser@example.com"))
        user = res.scalars().first()
        if user:
            user.is_verified = True
            user.hashed_password = get_password_hash("password123")
            print("Updated testuser@example.com to password123 and set verified=True")
        else:
            user = User(
                email="testuser@example.com",
                hashed_password=get_password_hash("password123"),
                full_name="Test User",
                is_verified=True,
                is_active=True,
                role="user"
            )
            s.add(user)
            print("Created testuser@example.com with password123 and verified=True")
        await s.commit()

if __name__ == "__main__":
    asyncio.run(main())
