"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A-Share AI Research Content Evidence-Chain & Compliance Review Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.routers import dashboard, analyses, rules, review_tasks, audit_logs

app.include_router(dashboard.router)
app.include_router(analyses.router)
app.include_router(rules.router)
app.include_router(review_tasks.router)
app.include_router(audit_logs.router)


@app.get("/api/v1/health")
def health_check():
    """Health check endpoint."""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "app_name": settings.app_name,
            "version": settings.app_version,
        },
        "message": "Service is running",
    }
