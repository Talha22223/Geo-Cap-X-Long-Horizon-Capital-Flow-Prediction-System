import asyncio
from datetime import datetime

import os
import sys

ai_root = os.path.dirname(os.path.abspath(__file__))
if ai_root not in sys.path:
    sys.path.insert(0, ai_root)

from config import settings
settings.DATABASE_URL = "sqlite+aiosqlite:///:memory:"

from core.database import reset_engine, get_engine, get_session_factory
from models.base import Base
from models.event import ExtractedEvent, CanonicalEvent
from ingestion.resolver import EventResolver
import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

@pytest.mark.asyncio
async def test_clustering():
    reset_engine(settings.DATABASE_URL)
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    Session = get_session_factory()
    async with Session() as db:
        resolver = EventResolver(db)
        
        # 1. Create candidate A
        ev_a = ExtractedEvent(
            raw_event_id="raw_1",
            title="Federal Reserve Hikes Interest Rates by 25 basis points",
            body="The Fed raised rates...",
            category="MONETARY_POLICY",
            countries=["United States"],
            sectors=["Financial Services"],
            sentiment="BEARISH",
            overall_confidence=0.7,
            severity=0.5,
            publication_timestamp=datetime(2023, 5, 1),
            source_provider="newsapi"
        )
        db.add(ev_a)
        await db.flush()
        c_a = await resolver.resolve(ev_a)
        
        # 2. Create candidate B (similar, should cluster)
        ev_b = ExtractedEvent(
            raw_event_id="raw_2",
            title="Fed raises rates by 0.25% in latest meeting",
            body="Federal Reserve policymakers decided to hike...",
            category="MONETARY_POLICY",
            countries=["United States"],
            sectors=["Financial Services"],
            sentiment="BEARISH",
            overall_confidence=0.8,
            severity=0.5,
            publication_timestamp=datetime(2023, 5, 1, 4),
            source_provider="tradingeconomics"
        )
        db.add(ev_b)
        await db.flush()
        c_b = await resolver.resolve(ev_b)
        
        # 3. Create candidate C (unrelated but same country/category)
        ev_c = ExtractedEvent(
            raw_event_id="raw_3",
            title="US Treasury Announces New Bond Auction Schedule",
            body="The Treasury will auction bonds...",
            category="MONETARY_POLICY",
            countries=["United States"],
            sectors=["Financial Services"],
            sentiment="NEUTRAL",
            overall_confidence=0.6,
            severity=0.2,
            publication_timestamp=datetime(2023, 5, 2),
            source_provider="newsapi"
        )
        db.add(ev_c)
        await db.flush()
        c_c = await resolver.resolve(ev_c)
        
        # 4. Check clusters
        stmt = select(CanonicalEvent).options(selectinload(CanonicalEvent.extracted_events))
        res = await db.execute(stmt)
        clusters = res.scalars().all()
        
        for i, ev in enumerate(clusters):
            print(f"\nCluster {i+1}: {ev.title}")
            print(f"  Confidence: {ev.confidence} (Bonus added for independent sources!)")
            print(f"  Supporting Articles: {ev.supporting_article_count}")
            print(f"  Independent Sources: {ev.independent_source_count}")
            for ext in ev.extracted_events:
                print(f"    - {ext.title}")

if __name__ == "__main__":
    asyncio.run(test_clustering())
