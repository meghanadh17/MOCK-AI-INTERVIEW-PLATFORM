import time
import uuid
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = structlog.get_logger(__name__)


class RequestTimingIDMiddleware(BaseHTTPMiddleware):
    """Adds an X-Request-ID trace identifier and computes request execution times."""
    
    async def dispatch(self, request: Request, call_next):
        # 1. Retrieve or generate unique Request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        
        # 2. Bind the request ID contextvars for structlog autoinjection
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        
        # 3. Track request execution duration
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # 4. Map timing metrics headers to response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        
        logger.info(
            "request_processed",
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            duration=f"{process_time * 1000:.2f}ms"
        )
        return response


def register_middlewares(app: FastAPI) -> None:
    """Registers global compression, request-ID trace wrappers, and CORS policies."""
    
    # 1. Timing & Trace Request ID Middleware
    app.add_middleware(RequestTimingIDMiddleware)
    
    # 2. GZip Compression Middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # 3. CORS Configuration
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
