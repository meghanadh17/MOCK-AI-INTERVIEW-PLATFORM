from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Create async engine with production connection pooling config
engine = create_async_engine(
    settings.DATABASE_URI,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
    pool_timeout=30,
)

# Async session factory
async_session_maker = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession,
)

# Transient session factory helper for Celery workers
# Uses NullPool to prevent connection caching issues across asyncio.run event loop cycles.
def get_task_session():
    from sqlalchemy.pool import NullPool
    task_engine = create_async_engine(
        settings.DATABASE_URI,
        echo=False,
        future=True,
        poolclass=NullPool,
    )
    session_factory = async_sessionmaker(
        bind=task_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    return session_factory, task_engine

def run_async_task(coro):
    """Safely runs an async coroutine inside a synchronous Celery task.
    Supports running inside tests where an event loop is already active.
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(asyncio.run, coro)
            return future.result()
    else:
        return asyncio.run(coro)

# Base model class
class Base(DeclarativeBase):
    pass

# Dependency for routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Import all models to register with Base.metadata
from app.domains.auth.models import User
from app.domains.resume.models import Resume
from app.domains.interview.models import Interview, InterviewQuestion, QuestionBank, QuestionBankRating
from app.domains.quiz.models import Quiz, QuizQuestion, QuizAttempt, ReportedQuestion
from app.domains.video_interview.models import VideoSession, FrameMetric, SpeechSegment
from app.domains.session_review.models import SessionReport, ProgressSnapshot
from app.domains.jobs.models import JobListing, SavedJob, JobMatch
