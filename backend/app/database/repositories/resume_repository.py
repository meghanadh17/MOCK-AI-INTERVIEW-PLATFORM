from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.repositories.base_repository import BaseRepository
from app.domains.resume.models import Resume


class ResumeRepository(BaseRepository[Resume]):
    """Repository mapping resumes database tables access operations."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Resume, db)

    async def get_by_user(self, user_id: str) -> List[Resume]:
        result = await self.db.execute(select(Resume).where(Resume.user_id == user_id))
        return result.scalars().all()
