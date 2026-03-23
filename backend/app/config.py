from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator


class Settings(BaseSettings):
    # Database
    postgres_db: str = "judicial_assistant"
    postgres_user: str = "postgres"
    postgres_password: str = "postgres_password"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    # JWT
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    
    # Qdrant
    qdrant_host: str = "qdrant"
    qdrant_port: int = 6333
    
    # MinIO
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"
    minio_host: str = "minio"
    minio_port: int = 9000
    
    # Service URLs
    ollama_url: str = "http://localhost:11434"
    bge_m3_url: str = "http://bge_m3:8001"
    bge_reranker_url: str = "http://bge_reranker:8002"
    jais_url: str = "http://jais:8003"
    fallback_model_url: str = "http://fallback_model:8004"
    jais_timeout_seconds: int = 180
    enable_sparse_search: bool = False
    embedding_dimension: int = 384
    ollama_model_primary: str = "jwnder/jais-adaptive:7b"
    ollama_model_fallback: str = "qwen2.5:1.5b-instruct"
    ollama_timeout_seconds: int = 120
    
    # Gemini
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    
    # Application
    debug: bool = True
    app_name: str = "AI Judicial Assistant"
    CORS_ORIGINS: list[str] = ["*"]
    ALLOWED_HOSTS: list[str] = ["*"]

    model_config = ConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "dev", "development"}:
                return True
            if normalized in {"0", "false", "no", "off", "prod", "production", "release"}:
                return False
        return value
    
settings = Settings()

