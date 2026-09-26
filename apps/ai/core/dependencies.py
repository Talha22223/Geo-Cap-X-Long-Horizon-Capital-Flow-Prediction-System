from typing import AsyncGenerator, Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

import core.database as _db_module
from core.redis_client import get_redis_client
from providers.registry import ProviderRegistry
from providers.base import BaseNLPProvider
from config import settings


# ── Database session ──────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async SQLAlchemy session, guaranteed to close on exit."""
    async with _db_module.get_session_factory()() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Redis client ──────────────────────────────────────────────────────────────

async def get_redis() -> Redis:
    """Yield the shared Redis async client."""
    return await get_redis_client()


# ── NLP Provider ──────────────────────────────────────────────────────────────

def get_nlp_provider() -> BaseNLPProvider:
    """
    Return the configured NLP provider from the registry.
    Provider is determined by NLP_PROVIDER setting — no hardcoding.
    """
    return ProviderRegistry.get_provider(settings.NLP_PROVIDER)


# ── Convenience type aliases for router injection ─────────────────────────────

DBSession = Annotated[AsyncSession, Depends(get_db)]
RedisClient = Annotated[Redis, Depends(get_redis)]
NLPProvider = Annotated[BaseNLPProvider, Depends(get_nlp_provider)]
