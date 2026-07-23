import asyncio
from app.database.base import async_session_maker
from sqlalchemy import select
from app.domains.video_interview.models import VideoSession

async def main():
    async with async_session_maker() as s:
        res = await s.execute(select(VideoSession).order_by(VideoSession.created_at.desc()).limit(5))
        sessions = res.scalars().all()
        print("Latest video sessions in DB:")
        for s in sessions:
            print(f"- ID: {s.id}, User ID: {s.user_id}, Status: {s.status}, Created: {s.created_at}, Text Session ID: {s.interview_session_id}")

if __name__ == "__main__":
    asyncio.run(main())
