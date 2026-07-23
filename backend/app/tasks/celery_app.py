from celery import Celery
from app.config import settings

celery_app = Celery(
    "mocrai_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.notification_tasks",
        "app.tasks.report_tasks",
        "app.tasks.resume_tasks",
        "app.tasks.video_tasks",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Auto-discover Celery tasks from the app.tasks namespace
celery_app.autodiscover_tasks(["app.tasks"])
