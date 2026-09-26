"""
Redis async client for caching and job queue connectivity.
"""
from redis.asyncio import Redis, from_url
from config import settings
import logging

logger = logging.getLogger(__name__)

_redis_client: Redis | None = None


async def get_redis_client() -> Redis:
    """Return the shared Redis async client, creating it on first call."""
    global _redis_client
    if _redis_client is None:
        _redis_client = from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        logger.info(f"Redis client connected: {settings.REDIS_URL}")
    return _redis_client


async def close_redis_client() -> None:
    """Close Redis connection on shutdown."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis client closed.")


async def cache_set(key: str, value: str, ttl: int = settings.REDIS_CACHE_TTL) -> None:
    """Set a value in Redis cache with TTL."""
    client = await get_redis_client()
    await client.set(key, value, ex=ttl)


async def cache_get(key: str) -> str | None:
    """Get a cached value from Redis."""
    client = await get_redis_client()
    return await client.get(key)


async def cache_delete(key: str) -> None:
    """Invalidate a cache key."""
    client = await get_redis_client()
    await client.delete(key)
