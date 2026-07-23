import asyncio
from app.database.base import async_session_maker
from sqlalchemy import select
from app.domains.interview.models import InterviewQuestion

async def main():
    async with async_session_maker() as s:
        res = await s.execute(select(InterviewQuestion).where(InterviewQuestion.interview_id == "6580f821-c65f-4ab2-93ba-e97632eada3c"))
        questions = res.scalars().all()
        print("Questions for interview session 6580f821-c65f-4ab2-93ba-e97632eada3c:")
        for q in questions:
            print(f"- ID: {q.id}, Text: {q.question_text[:30]}..., Answered: {q.answered_at is not None}, Asked: {q.asked_at is not None}")

if __name__ == "__main__":
    asyncio.run(main())
