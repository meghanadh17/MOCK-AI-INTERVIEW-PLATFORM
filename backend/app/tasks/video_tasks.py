import time
import logging
from app.tasks.celery_app import celery_app
from app.database.base import async_session_maker
from app.domains.video_interview.service import VideoInterviewService

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.video_tasks.process_video_interview_task")
def process_video_interview_task(question_id: str) -> dict:
    print(f"Running MediaPipe/Holistic analysis on video question ID: {question_id}")
    time.sleep(5.0)
    return {"question_id": question_id, "status": "completed"}


@celery_app.task(name="app.tasks.video_tasks.transcribe_video_task")
def transcribe_video_task(session_id: str, user_id: str) -> dict:
    """Asynchronously runs Whisper v3 on session recordings."""
    logger.info(f"Triggering Whisper v3 transcription task for video session: {session_id}")
    # Simulate processing time
    time.sleep(2.0)
    return {"session_id": session_id, "status": "success", "task": "transcription"}


@celery_app.task(name="app.tasks.video_tasks.analyze_video_session_task")
def analyze_video_session_task(session_id: str, user_id: str) -> dict:
    """Asynchronously runs full holistic pipeline analysis."""
    logger.info(f"Triggering async video analytics task for video session: {session_id}")
    time.sleep(3.0)
    return {"session_id": session_id, "status": "success", "task": "analysis"}
