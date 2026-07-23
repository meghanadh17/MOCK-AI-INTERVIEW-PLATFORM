import structlog
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from slowapi.errors import RateLimitExceeded

logger = structlog.get_logger(__name__)


class AppBaseException(Exception):
    """Base exception for all custom app errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class EntityNotFoundException(AppBaseException):
    """Raised when looking up an item that doesn't exist."""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class InvalidCredentialsException(AppBaseException):
    """Raised when auth token or password checks fail."""
    def __init__(self, message: str = "Invalid auth credentials"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)


class UnauthorizedException(AppBaseException):
    """Raised when the user has invalid permissions for a resource."""
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class ValidationException(AppBaseException):
    """Raised when data validations fail."""
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class ConflictException(AppBaseException):
    """Raised when there is a resource conflict (e.g. unique constraints)."""
    def __init__(self, message: str = "Resource conflict occurred"):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)


class RateLimitException(AppBaseException):
    """Raised when request thresholds are exceeded."""
    def __init__(self, message: str = "Too many requests. Please try again later."):
        super().__init__(message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)


class DatabaseException(AppBaseException):
    """Raised when database transactions fail."""
    def __init__(self, message: str = "Internal database transaction error"):
        super().__init__(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


def register_exception_handlers(app: FastAPI) -> None:
    """Registers global exception handlers for mapping all errors to structured JSON schemas."""
    
    @app.exception_handler(AppBaseException)
    async def app_exception_handler(request: Request, exc: AppBaseException):
        logger.warning(
            "app_exception_raised",
            path=request.url.path,
            error_type=exc.__class__.__name__,
            message=exc.message,
            status_code=exc.status_code
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "type": exc.__class__.__name__,
                    "message": exc.message
                }
            }
        )

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
        logger.warning(
            "rate_limit_exceeded",
            path=request.url.path,
            ip=request.client.host if request.client else "unknown"
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "error": {
                    "type": "RateLimitExceeded",
                    "message": "Too many requests. Please slow down."
                }
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            "request_validation_failed",
            path=request.url.path,
            errors=exc.errors()
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "type": "RequestValidationError",
                    "message": "Request validation failed.",
                    "details": exc.errors()
                }
            }
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_handler(request: Request, exc: ValidationError):
        logger.warning(
            "pydantic_validation_failed",
            path=request.url.path,
            errors=exc.errors()
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "type": "ValidationError",
                    "message": "Data schema validation failed.",
                    "details": exc.errors()
                }
            }
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "unhandled_server_exception",
            path=request.url.path,
            error=str(exc)
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "type": "InternalServerError",
                    "message": "An unexpected error occurred. Please contact system support."
                }
            }
        )

