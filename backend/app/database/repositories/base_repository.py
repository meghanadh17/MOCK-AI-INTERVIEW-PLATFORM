from typing import Generic, TypeVar, Type, List, Optional, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic repository implementing standard database CRUD patterns."""
    
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get(self, id: Any) -> Optional[ModelType]:
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalars().first()

    async def get_multi(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        result = await self.db.execute(select(self.model).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj_in: ModelType) -> ModelType:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"DEBUG BASE REPO: Adding {type(obj_in)} to session {id(self.db)}")
        self.db.add(obj_in)
        await self.db.flush()
        logger.warning(f"DEBUG BASE REPO: Flushed {type(obj_in)}. obj_in.id={getattr(obj_in, 'id', None)}")
        return obj_in

    async def update(
        self, 
        db_obj: ModelType, 
        obj_in: Union[dict[str, Any], Any]
    ) -> ModelType:
        """Updates a database object fields from dict or model/schema data."""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            if hasattr(obj_in, "model_dump"):
                update_data = obj_in.model_dump(exclude_unset=True)
            elif hasattr(obj_in, "dict"):
                update_data = obj_in.dict(exclude_unset=True)
            else:
                update_data = obj_in.__dict__
                
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.flush()
        return db_obj

    async def count(self) -> int:
        """Returns the total number of records for this model."""
        from sqlalchemy import func
        result = await self.db.execute(select(func.count()).select_from(self.model))
        return result.scalar() or 0

    async def remove(self, id: Any) -> Optional[ModelType]:
        obj = await self.get(id)
        if obj:
            await self.db.delete(obj)
            await self.db.flush()
        return obj
