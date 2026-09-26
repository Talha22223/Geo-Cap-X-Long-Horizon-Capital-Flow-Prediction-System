"""
Async SQLAlchemy database engine and session factory.

All AI-specific tables are managed via SQLAlchemy here.
The NestJS side uses Prisma against the same PostgreSQL instance.

Design note: Engine is created lazily so that the DATABASE_URL can be
overridden in tests (via settings mutation) before the first call.
"""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)
from config import settings
import logging

logger = logging.getLogger(__name__)

# Module-level singletons — set to None until _get_engine() is first called.
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _build_engine(url: str) -> AsyncEngine:
    """Build engine with dialect-appropriate options."""
    is_sqlite = url.startswith("sqlite")
    if is_sqlite:
        # SQLite doesn't support connection pooling options
        return create_async_engine(url, echo=settings.DEBUG, connect_args={"check_same_thread": False})
    return create_async_engine(
        url,
        echo=settings.DEBUG,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )




def get_engine() -> AsyncEngine:
    """Return (or lazily create) the shared async engine."""
    global _engine
    if _engine is None:
        _engine = _build_engine(settings.DATABASE_URL)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return (or lazily create) the shared session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


def reset_engine(url: str | None = None) -> None:
    """
    Tear down and recreate engine (used in tests to swap database URL).
    Call this BEFORE any session is opened.
    """
    global _engine, _session_factory
    _engine = None
    _session_factory = None
    if url is not None:
        settings.DATABASE_URL = url


# Convenience alias used throughout the codebase.
# Accessing this attribute calls the lazy factory every time — callers that
# call AsyncSessionLocal() will always get the current (possibly overridden)
# session factory.
class _SessionProxy:
    """Proxy that delegates calls to the lazy session factory."""

    def __call__(self, *args, **kwargs):
        return get_session_factory()(*args, **kwargs)


AsyncSessionLocal = _SessionProxy()


# ── Lifecycle helpers ─────────────────────────────────────────────────────────

async def create_all_tables() -> None:
    """Create all tables defined in SQLAlchemy models (called on startup)."""
    from models.base import Base  # noqa: F401 — ensure all models are imported
    import models.event  # noqa: F401
    import models.event_chain  # noqa: F401
    import models.capital_flow  # noqa: F401
    import models.forecast  # noqa: F401
    import models.backtest  # noqa: F401
    import models.reference  # noqa: F401
    import models.sna  # noqa: F401
    import models.inference  # noqa: F401
    import models.jobs  # noqa: F401
    import technical.models  # noqa: F401

    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created / verified.")


async def dispose_engine() -> None:
    """Graceful engine disposal on shutdown."""
    if _engine is not None:
        await _engine.dispose()
    logger.info("Database engine disposed.")

