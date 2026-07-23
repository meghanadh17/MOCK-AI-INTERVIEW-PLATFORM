import os
import structlog
from sqlalchemy import text
from app.database.base import engine, Base
from app.config import settings

logger = structlog.get_logger(__name__)


async def startup_handler() -> None:
    # 1. Initialize local upload storage directories to prevent FileNotFoundError
    logger.info("startup_init_storage_directories")
    try:
        dirs_to_create = [
            settings.LOCAL_STORAGE_DIR,
            os.path.join(settings.LOCAL_STORAGE_DIR, "resumes"),
            os.path.join(settings.LOCAL_STORAGE_DIR, "audio"),
            os.path.join(settings.LOCAL_STORAGE_DIR, "video"),
        ]
        for d in dirs_to_create:
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=True)
                logger.info("storage_directory_created", directory=d)
    except Exception as e:
        logger.error("storage_directory_creation_failed", error=str(e))

    # 2. Test database connection engine with a health ping query
    logger.info("startup_ping_database")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("database_ping_successful")
    except Exception as e:
        logger.error(
            "database_ping_failed",
            error=str(e),
            guidance="Ensure database server is running and connection parameters are correct."
        )
        # Fail fast in production
        if os.getenv("APP_ENV") == "production":
            raise RuntimeError(f"Database connection failed during startup initialization: {str(e)}")

    # 3. Initialize SQL tables schemas
    logger.info("startup_init_database_schemas")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("database_schemas_initialized")
    except Exception as e:
        logger.error("database_schema_initialization_failed", error=str(e))


async def shutdown_handler() -> None:
    logger.info("shutdown_close_database_connections")
    try:
        await engine.dispose()
        logger.info("database_connections_closed")
    except Exception as e:
        logger.error("database_connections_closure_failed", error=str(e))

