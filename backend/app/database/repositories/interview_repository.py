from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database.repositories.base_repository import BaseRepository
from app.domains.interview.models import Interview, InterviewQuestion


class InterviewRepository(BaseRepository[Interview]):
    """Repository mapping interviews database tables access operations."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Interview, db)

    async def get(self, id: str) -> Optional[Interview]:
        result = await self.db.execute(
            select(Interview).where(
                Interview.id == id,
                Interview.deleted_at.is_(None)
            )
        )
        return result.scalars().first()

    async def get_with_questions(self, interview_id: str, user_id: str) -> Optional[Interview]:
        result = await self.db.execute(
            select(Interview)
            .options(selectinload(Interview.questions))
            .where(
                Interview.id == interview_id,
                Interview.user_id == user_id,
                Interview.deleted_at.is_(None)
            )
        )
        return result.scalars().first()

    async def get_by_user(self, user_id: str) -> List[Interview]:
        result = await self.db.execute(
            select(Interview).where(
                Interview.user_id == user_id,
                Interview.deleted_at.is_(None)
            )
        )
        return result.scalars().all()


class InterviewQuestionRepository(BaseRepository[InterviewQuestion]):
    """Repository mapping interview questions database tables access operations."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(InterviewQuestion, db)

    async def get_question(self, question_id: str, interview_id: str) -> Optional[InterviewQuestion]:
        result = await self.db.execute(
            select(InterviewQuestion).where(
                InterviewQuestion.id == question_id,
                InterviewQuestion.interview_id == interview_id
            )
        )
        return result.scalars().first()
