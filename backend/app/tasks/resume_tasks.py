import time
import asyncio
import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.resume_tasks.parse_resume_task")
def parse_resume_task(resume_id: str, file_path: str) -> dict:
    """Synchronous Celery wrapper that executes the async resume parsing pipeline."""
    logger.info(f"Celery: Starting async parse pipeline task for resume ID: {resume_id}")
    try:
        from app.database.base import run_async_task
        # Execute async parsing context
        return run_async_task(_async_parse_resume_task(resume_id, file_path))
    except Exception as e:
        logger.error(f"Celery task execution failed for resume {resume_id}: {e}")
        return {"resume_id": resume_id, "status": "failed", "error": str(e)}


async def _async_parse_resume_task(resume_id: str, file_path: str) -> dict:
    from app.database.base import get_task_session
    from app.domains.resume.service import ResumeService
    
    session_maker, task_engine = get_task_session()
    try:
        async with session_maker() as db:
            await ResumeService.parse_and_index_resume(db, resume_id, file_path)
            return {"resume_id": resume_id, "status": "success"}
    finally:
        await task_engine.dispose()


@celery_app.task(name="app.tasks.resume_tasks.analyze_resume_task")
def analyze_resume_task(resume_id: str) -> dict:
    logger.info(f"Celery: Ingesting and indexing analysis for resume ID: {resume_id}")
    time.sleep(1.0)
    return {"resume_id": resume_id, "status": "success"}
