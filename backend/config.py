"""
Configuration settings for the AI Judicial Assistant Platform API.
"""

import os
from typing import Optional


class Settings:
    """Application configuration settings."""
    
    # Database settings
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@postgres:5432/judicial_assistant"
    )
    
    # JWT settings
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # API settings
    api_title: str = "AI Judicial Assistant Platform"
    api_version: str = "0.1.0"
    api_description: str = "API for AI-powered judicial case management and analysis"
    
    # CORS settings
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://frontend:80",
        "http://0.0.0.0:3000"
    ]
    cors_credentials: bool = True
    cors_methods: list = ["*"]
    cors_headers: list = ["*"]
    
    # Service endpoints
    embedding_service_url: str = os.getenv("EMBEDDING_SERVICE_URL", "http://bge_m3:8001")
    reranker_service_url: str = os.getenv("RERANKER_SERVICE_URL", "http://bge_reranker:8002")
    llm_service_url: str = os.getenv("LLM_SERVICE_URL", "http://jais:8003")
    fallback_llm_service_url: str = os.getenv("FALLBACK_LLM_SERVICE_URL", "http://fallback_model:8004")
    
    # Vector DB settings
    qdrant_url: str = os.getenv("QDRANT_URL", "http://qdrant:6333")
    qdrant_collection_name: str = "judicial_documents"
    

    # Object storage settings
    minio_endpoint: str = os.getenv("MINIO_ENDPOINT", "minio:9000")
    minio_access_key: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    minio_secret_key: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    minio_bucket: str = os.getenv("MINIO_BUCKET", "judicial-documents")
    
    # Application settings
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    max_request_size: int = 100 * 1024 * 1024  # 100MB
    request_timeout: int = 300  # 5 minutes
    
    class Config:
        env_file = ".env"


# Create a global settings instance
settings = Settings()
