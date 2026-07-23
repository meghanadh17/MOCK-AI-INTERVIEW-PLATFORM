def patch_asyncio_selector_events():
    """
    Patch asyncio.selector_events._SelectorSocketTransport._write_send
    to prevent infinite loops of AssertionError: Data should not be empty.
    """
    import asyncio.selector_events
    import logging

    original_write_send = getattr(asyncio.selector_events._SelectorSocketTransport, '_write_send', None)
    if original_write_send is None:
        logging.getLogger(__name__).info("asyncio _SelectorSocketTransport has no _write_send; skipping patch.")
        return

    def patched_write_send(self):
        if not self._buffer:
            if hasattr(self, '_sock_fd') and self._sock_fd is not None:
                try:
                    self._loop._remove_writer(self._sock_fd)
                except Exception:
                    pass
            return
        return original_write_send(self)

    asyncio.selector_events._SelectorSocketTransport._write_send = patched_write_send
    logging.getLogger(__name__).info("Patched asyncio _SelectorSocketTransport._write_send to prevent empty buffer assertions.")

patch_asyncio_selector_events()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Test comment for WatchFiles reload detection


from app.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.core.middleware import register_middlewares
from app.core.events import startup_handler, shutdown_handler

# Import Domain Routers
from app.domains.auth.router import router as auth_router
from app.domains.resume.router import router as resume_router
from app.domains.interview.router import router as interview_router
from app.domains.video_interview.router import router as video_router, ws_router as video_ws_router
from app.domains.session_review.router import router as review_router
from app.domains.quiz.router import router as quiz_router
from app.domains.jobs.router import router as jobs_router
from app.domains.websocket_router import router as unified_ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await startup_handler()
    yield
    await shutdown_handler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Exception handlers & middleware
register_exception_handlers(app)
register_middlewares(app)

# Mount local uploads directory for static file serving (videos, resumes, audio)
from fastapi.staticfiles import StaticFiles
import os

uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include domain routers with API version v1
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["authentication"])
app.include_router(resume_router, prefix=f"{settings.API_V1_STR}/resume", tags=["resumes"])
app.include_router(interview_router, prefix=f"{settings.API_V1_STR}/interview", tags=["interviews"])
app.include_router(video_router, prefix=f"{settings.API_V1_STR}/video-interview", tags=["video-interviews"])
app.include_router(video_ws_router, prefix="/ws/video-interview", tags=["video-interviews-ws"])
app.include_router(review_router, prefix=f"{settings.API_V1_STR}/sessions", tags=["sessions"])
app.include_router(quiz_router, prefix=f"{settings.API_V1_STR}/quiz", tags=["quizzes"])
app.include_router(jobs_router, prefix=f"{settings.API_V1_STR}/jobs", tags=["jobs"])
app.include_router(unified_ws_router, prefix="/ws", tags=["realtime-websockets"])


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }
