"""
Tests for Multi-Strategy Event Deduplicator.
"""
from datetime import datetime, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from ingestion.deduplicator import MultiStrategyDeduplicator
from models.event import RawEvent


@pytest.mark.asyncio
async def test_hash_deduplication(db: AsyncSession):
    # Seed a raw event
    body = "The Federal Reserve kept interest rates unchanged at 5.50% today."
    body_hash = MultiStrategyDeduplicator.calculate_hash(body)
    
    raw = RawEvent(
        source_id="seed",
        source_type="SEED",
        title="Fed rates",
        body=body,
        content_hash=body_hash,
        published_at=datetime.now(timezone.utc),
    )
    db.add(raw)
    await db.commit()

    # Query with exact same body hash
    is_dup, score, reason = await MultiStrategyDeduplicator.is_duplicate(
        db,
        title="Fed rates new",
        body=body,
        source_id="seed",
        published_at=datetime.now(timezone.utc),
    )
    assert is_dup is True
    assert score == 1.0
    assert "Hash Match" in reason


@pytest.mark.asyncio
async def test_composite_similarity_deduplication(db: AsyncSession):
    body_original = "Russia launched military strikes in Ukraine causing major crude oil price jumps."
    body_hash = MultiStrategyDeduplicator.calculate_hash(body_original)
    pub = datetime.now(timezone.utc)
    
    raw = RawEvent(
        source_id="seed",
        source_type="SEED",
        title="Conflict in Ukraine",
        body=body_original,
        content_hash=body_hash,
        published_at=pub,
    )
    db.add(raw)
    await db.commit()

    # Query with highly similar title and body within time window
    is_dup, score, reason = await MultiStrategyDeduplicator.is_duplicate(
        db,
        title="Conflict in Ukraine Escalates",
        body="Russia launched military strikes in Ukraine causing major crude oil prices to rise today.",
        source_id="seed",
        published_at=pub,
    )
    assert is_dup is True
    assert score > 0.75
    assert "Composite Similarity" in reason
