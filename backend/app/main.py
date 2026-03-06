"""
FastAPI application factory for AI Judicial Assistant Platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.auth.middleware import JWTMiddleware
from app.startup import init_stores
from app.database import init_db
from app.modules.case.routes import router as case_router
from app.modules.document.routes import router as case_document_router, document_router
from app.modules.user.routes import admin_router as user_admin_router
from app.modules.audit.routes import router as audit_router
from app.modules.evaluation.routes import router as evaluation_router
from app.modules.search.routes import router as search_router
from app.modules.similarity.routes import router as similarity_router
from app.modules.graph.routes import router as graph_router
from app.auth.routes import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown event handlers."""
    # Startup
    await init_db()
    await init_stores()
    yield
    # Shutdown
    pass


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    
    app = FastAPI(
        title="AI Judicial Assistant Platform",
        description="Backend API for judicial case analysis and judgment assistance",
        version="0.1.0",
        lifespan=lifespan
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Trusted Host middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )
    
    # JWT middleware
    app.add_middleware(JWTMiddleware)
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok"}
    
    # Include routers
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(case_router, prefix="/api/v1", tags=["cases"])
    app.include_router(case_document_router, prefix="/api/v1", tags=["documents"])
    app.include_router(document_router, prefix="/api/v1", tags=["documents"])
    app.include_router(user_admin_router, prefix="/api/v1", tags=["admin"])
    app.include_router(audit_router, prefix="/api/v1", tags=["admin"])
    app.include_router(evaluation_router, prefix="/api/v1", tags=["admin"])
    app.include_router(search_router, prefix="/api/v1", tags=["search"])
    app.include_router(similarity_router, prefix="/api/v1", tags=["similarity"])
    app.include_router(graph_router, prefix="/api/v1", tags=["graph"])
    
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
