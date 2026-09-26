"""
============================================================================
GEOCAP-X AI ENGINE & PREDICTION MICROSERVICE - FASTAPI APPLICATION
============================================================================
WHAT:
  Core Python FastAPI service operating on port 8000.
  Executes:
  - Multi-Horizon Capital Flow Forecasting (6M, 1Y, 3Y, 5Y)
  - Social Network Analysis (SNA: PageRank, Betweenness, Degree Centrality)
  - Event Causal Propagation and Chain Analysis
  - Real Market Ingestion & Statistical Abnormality Detection (Z-scores)
  - Multi-Timeframe Technical Analysis & SMC (Order Blocks, Liquidity, Patterns)
  - Point-in-Time Historical Backtesting & Leakage Testing
  - 10-Tier Explainability & Provenance Traceability Engine

WHY:
  Provides mathematical rigor, machine learning sequence forecasting, and explainable
  financial intelligence isolated within a high-performance Python runtime.

HOW IT CONNECTS:
  - Upstream: NestJS API Gateway proxies client requests to `/api/v1/*`.
  - Database: SQLAlchemy async session pool connecting to PostgreSQL 15.
  - Cache & Tasks: Redis 7 client for queuing background tasks and distributed caching.
============================================================================
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from core.database import create_all_tables, dispose_engine
from core.redis_client import close_redis_client
from core.exceptions import GeoCAPBaseException, geocap_exception_handler, generic_exception_handler
from providers.registry import register_all_providers
from ingestion.sources.registry import register_all_sources
from api.v1.router import api_router

# Configure logging
logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown lifecycles cleanly.
    """
    logger.info("Initializing GeoCap-X AI Engine resources...")
    
    # Register NLP providers
    register_all_providers()
    
    # Register Ingestion source adapters
    register_all_sources()

    # Create missing database tables
    try:
        await create_all_tables()
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")

    # Clean up stale jobs on startup
    try:
        from core.database import get_session_factory
        from workers.job_manager import JobLifecycleManager
        async with get_session_factory()() as db:
            cleaned_count = await JobLifecycleManager.cleanup_stale_jobs(db)
            if cleaned_count > 0:
                logger.info(f"Startup: Cleaned up {cleaned_count} stale background jobs.")
    except Exception as e:
        logger.error(f"Failed to run startup stale jobs cleanup: {e}")

    yield

    logger.info("Closing GeoCap-X AI Engine resources...")
    await close_redis_client()
    await dispose_engine()
    logger.info("AI Service shutdown successfully.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(GeoCAPBaseException, geocap_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Diagnostics route
@app.get("/health", tags=["Diagnostics"])
def health_check():
    logger.info("Health check endpoint hit")
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION
    }

# Mount global REST API V1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting AI service on http://{settings.HOST}:{settings.PORT}")
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
