import asyncio
import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.report_tasks.generate_report_task")
def generate_report_task(session_id: str) -> dict:
    """Synchronous Celery wrapper that executes the async report compiling task."""
    logger.info(f"Celery: Compiling performance report for session: {session_id}")
    try:
        from app.database.base import run_async_task
        return run_async_task(_async_generate_report_task(session_id))
    except Exception as e:
        logger.error(f"Celery: Report compilation task failed for session {session_id}: {e}")
        return {"session_id": session_id, "status": "failed", "error": str(e)}


async def _async_generate_report_task(session_id: str) -> dict:
    from app.database.base import get_task_session
    from app.domains.interview.service import InterviewService
    
    session_maker, task_engine = get_task_session()
    try:
        async with session_maker() as db:
            await InterviewService.generate_session_report(db, session_id)
            return {"session_id": session_id, "status": "success"}
    finally:
        await task_engine.dispose()
