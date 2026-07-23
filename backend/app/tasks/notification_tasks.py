import time
import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy import select

from app.tasks.celery_app import celery_app
from app.config import settings
from app.database.base import async_session_maker
from app.domains.auth.models import User

logger = logging.getLogger(__name__)


async def get_user_email(session, user_id: str) -> Optional[str]:
    """Retrieves the email address of a user asynchronously from the database."""
    stmt = select(User).where(User.id == user_id)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()
    return user.email if user else None


@celery_app.task(name="app.tasks.notification_tasks.send_email_task")
def send_email_task(user_id: str, message: str) -> dict:
    """Fetches user email and sends out OTP verification code via secure SMTP email."""
    logger.info(f"Executing send_email_task for user_id={user_id}")
    
    # 1. Resolve recipient email
    try:
        from app.database.base import get_task_session, run_async_task
        session_maker, task_engine = get_task_session()
        async def fetch():
            try:
                async with session_maker() as session:
                    return await get_user_email(session, user_id)
            finally:
                await task_engine.dispose()
        recipient_email = run_async_task(fetch())
    except Exception as db_err:
        logger.error(f"Failed to fetch user email for user_id={user_id}: {db_err}")
        recipient_email = None

    if not recipient_email:
        # Fallback if user_id is directly passed as an email address (e.g. mock test drivers)
        if "@" in user_id:
            recipient_email = user_id
        else:
            logger.error(f"Cannot send email: user ID {user_id} has no matching email records.")
            return {"user_id": user_id, "status": "failed", "reason": "No recipient email found"}

    # 2. Check configuration and fallback to mock print if SMTP_HOST is not set
    if not settings.SMTP_HOST:
        logger.warning(f"SMTP is not configured. Falling back to mock print. Email to {recipient_email} - Content: {message}")
        time.sleep(1.0)
        return {"user_id": user_id, "status": "sent_mock", "email": recipient_email}

    # 3. Build MIME Message
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = recipient_email
    msg["Subject"] = "MocrAI Verification Alert"
    msg.attach(MIMEText(message, "plain"))

    # 4. Dispatch email via secure SMTP connection
    try:
        logger.info(f"Connecting to SMTP host {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10.0)
        server.starttls()  # Upgrade connection to secure TLS
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, recipient_email, msg.as_string())
        server.quit()
        logger.info(f"Successfully sent email notification to {recipient_email}")
        return {"user_id": user_id, "status": "sent", "email": recipient_email}
    except Exception as smtp_err:
        logger.error(f"SMTP email dispatch failed for {recipient_email}: {smtp_err}")
        return {"user_id": user_id, "status": "failed", "reason": str(smtp_err)}
