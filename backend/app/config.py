import os
from typing import List, Union, Optional
from pydantic import BeforeValidator, field_validator, Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated


def parse_cors(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = Field(default="/api/v1", validation_alias="API_V1_PREFIX")
    PROJECT_NAME: str = Field(
        default="Smart AI Mock Interview & Performance Evaluation Platform",
        validation_alias="APP_NAME"
    )
    EMAIL_VERIFICATION_REQUIRED: bool = True
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = Field(default=[], validation_alias="ALLOWED_ORIGINS")

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if not v:
            return []
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Security
    SECRET_KEY: str = "supersecretkeychangeinproduction12345!"
    ALGORITHM: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60 * 24 * 7,
        validation_alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # Database
    MYSQL_SERVER: str = Field(default="localhost", validation_alias=AliasChoices("DB_HOST", "MYSQL_SERVER"))
    MYSQL_PORT: int = Field(default=3306, validation_alias=AliasChoices("DB_PORT", "MYSQL_PORT"))
    MYSQL_USER: str = Field(default="root", validation_alias=AliasChoices("DB_USER", "MYSQL_USER"))
    MYSQL_PASSWORD: str = Field(default="", validation_alias=AliasChoices("DB_PASSWORD", "MYSQL_PASSWORD"))
    MYSQL_DB: str = Field(default="mocrai", validation_alias=AliasChoices("DB_NAME", "MYSQL_DB"))
    
    # New DATABASE_URL setting from .env
    DATABASE_URL: str = ""
    
    # Assembled Database URI
    DATABASE_URI: str = ""

    @field_validator("DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str, info) -> str:
        if v:
            return v
        
        # Check if DATABASE_URL was provided
        db_url = info.data.get("DATABASE_URL")
        if db_url:
            return db_url
            
        server = info.data.get("MYSQL_SERVER", "localhost")
        port = info.data.get("MYSQL_PORT", 3306)
        user = info.data.get("MYSQL_USER", "root")
        password = info.data.get("MYSQL_PASSWORD", "")
        db = info.data.get("MYSQL_DB", "mocrai")
        
        return f"mysql+aiomysql://{user}:{password}@{server}:{port}/{db}"

    # Redis (for caching, web socket coordination, and Celery broker)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = ""

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def assemble_redis_url(cls, v: str, info) -> str:
        if v:
            return v
        host = info.data.get("REDIS_HOST", "localhost")
        port = info.data.get("REDIS_PORT", 6379)
        return f"redis://{host}:{port}/0"

    # Mistral AI Keys
    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-large-latest"
    
    # Local Storage Directory
    LOCAL_STORAGE_DIR: str = "uploads"

    # SMTP / Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    # WebRTC / TURN
    TURN_SERVER_URL: Optional[str] = None
    TURN_USERNAME: Optional[str] = None
    TURN_PASSWORD: Optional[str] = None

    # RapidAPI / JSearch
    RAPIDAPI_KEY: str = ""
    RAPIDAPI_HOST: str = "jsearch.p.rapidapi.com"


settings = Settings()

