"""
Pytest configuration and shared fixtures.

Uses SQLite in-memory for all tests — no external Postgres or Redis required.
The FastAPI app's get_db dependency is overridden at the app level so that
every router correctly uses the test database engine.
"""
import asyncio
from typing import AsyncGenerator, Generator
import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── Override DATABASE_URL BEFORE any core imports ────────────────────────────
import sys
import os

# Ensure apps/ai is on sys.path
ai_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ai_root not in sys.path:
    sys.path.insert(0, ai_root)

from config import settings
settings.DATABASE_URL = "sqlite+aiosqlite:///:memory:"
settings.NLP_PROVIDER = "stub"  # Use stub provider in tests — no spaCy model required

# Now safe to import database module (engine is lazy-created from settings)
from core.database import reset_engine
reset_engine("sqlite+aiosqlite:///:memory:")

from models.base import Base
from main import app
from core.dependencies import get_db
from providers.registry import register_all_providers
from ingestion.sources.registry import register_all_sources


# SQLite in-memory test engine — shared for the session
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

_test_engine = create_async_engine(
    TEST_DB_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)
_test_session_factory = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Register registries at startup
register_all_providers()
register_all_sources()

import core.database

@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create a persistent event loop for all session-scoped async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db() -> AsyncGenerator[None, None]:
    """Initialize SQLite in-memory database and create all tables for each test."""
    # Bind core.database module to the test engine/factory
    core.database._engine = _test_engine
    core.database._session_factory = _test_session_factory

    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency override — always returns a test DB session."""
    async with _test_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Apply dependency override to the app
app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transaction-isolated database session for unit tests."""
    async with _test_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Provide a test client for FastAPI endpoint integration tests."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
