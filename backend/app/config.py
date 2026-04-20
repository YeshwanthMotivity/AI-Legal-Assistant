from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator, Field


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
    
    # JWT — tokens are RS256-signed by Keycloak; the secret_key field is kept
    # only for any internal HS256 utility tokens (e.g. password-reset links).
    # RS256 verification uses JWKS from Keycloak, NOT this secret.
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    
    # Qdrant
    qdrant_host: str = "qdrant"
    qdrant_port: int = 6333
    embedding_dimension: int = 384
    enable_sparse_search: bool = False
    
    # MinIO
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"
    minio_host: str = "minio"
    minio_port: int = 9000
    
    # Keycloak
    keycloak_url: str = "http://keycloak:8080"
    keycloak_realm: str = "judicial"
    keycloak_client_id: str = "judicial-frontend"
    keycloak_client_secret: str = ""
    keycloak_admin_user: str = "admin"
    keycloak_admin_password: str = "admin"
    keycloak_issuer: Optional[str] = None
    
    @property
    def keycloak_issuer_url(self) -> str:
        if self.keycloak_issuer:
            return self.keycloak_issuer
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"
    
    @property
    def keycloak_jwks_url(self) -> str:
        return f"{self.keycloak_issuer_url}/protocol/openid-connect/certs"
    
    # Service URLs
    ollama_url: str = "http://10.10.0.1:11434"
    bge_m3_url: str = "http://bge_m3:8001"
    bge_reranker_url: str = "http://bge_reranker:8002"
    ollama_model_primary: str = "jais-adapted-7b-chat.Q4_K_M.gguf"
    ollama_model_fallback: str = "qwen2.5:7b"
    ollama_timeout_seconds: int = 600
    
    # Application
    debug: bool = True
    app_name: str = "AI Judicial Assistant"
    # "* " with allow_credentials=True is rejected by browsers — list origins explicitly.
    # Override via CORS_ORIGINS env var (comma-separated) in production.
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://172.20.100.215:3000",
    ]
    ALLOWED_HOSTS: list[str] = ["*"]
    # Max concurrent AI analyses a single user may run simultaneously.
    max_concurrent_analyses_per_user: int = 2
    max_file_size_mb: int = 50

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

# --- Security Guards (R2, R5) ---
if settings.jwt_secret_key == "your-secret-key-change-in-production":
    import sys
    if not settings.debug:
        raise RuntimeError(
            "FATAL: jwt_secret_key is set to the default placeholder. "
            "Set JWT_SECRET_KEY in your .env before deploying."
        )
    else:
        import logging
        logging.getLogger(__name__).warning(
            "WARNING: jwt_secret_key is using the default placeholder. "
            "This is only acceptable in local dev."
        )

if settings.keycloak_admin_password == "admin" and not settings.debug:
    import logging as _log5
    _log5.getLogger(__name__).critical(
        "SECURITY: keycloak_admin_password is set to 'admin' in a non-debug environment. "
        "Set KEYCLOAK_ADMIN_PASSWORD in your .env before going to production."
    )

