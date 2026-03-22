"""Runtime configuration for the AutoAgent backend."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings used across API, workers, and tests."""

    app_name: str = "AutoAgent API"
    api_prefix: str = "/api"
    debug: bool = True

    database_url: str = "sqlite:///./autoagent.db"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="AUTOAGENT_")


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings object for dependency injection."""

    return Settings()
