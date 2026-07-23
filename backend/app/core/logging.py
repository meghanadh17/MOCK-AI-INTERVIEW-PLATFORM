import logging
import sys
import os
from typing import Any, Dict
import structlog
from structlog.types import EventDict, Processor

# Cache structlog logger reference
logger = structlog.get_logger(__name__)


def inject_opentelemetry_traces(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Injects current active OpenTelemetry span context details (trace_id, span_id) if present."""
    try:
        from opentelemetry import trace
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            span_context = span.get_span_context()
            event_dict["trace_id"] = f"{span_context.trace_id:032x}"
            event_dict["span_id"] = f"{span_context.span_id:016x}"
    except ImportError:
        pass
    return event_dict


def setup_logging(level: str = "INFO") -> None:
    """Configures system-wide standard console structured logs logging formatter with structlog."""
    
    # 1. Map standard library logging handlers
    logging.basicConfig(
        level=level,
        format="%(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    # 2. Configure structlog processor pipeline
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        inject_opentelemetry_traces,
    ]

    # Render as JSON in production, else ConsoleRenderer for local development readability
    if os.getenv("APP_ENV") == "production" or os.getenv("DEBUG") != "true":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Silence third party noisy logs
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)

