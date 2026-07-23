from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "mocrai_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Configuration keys
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Auto-discover tasks in the workers module
celery_app.autodiscover_tasks(["app.workers"])
