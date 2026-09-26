import asyncio
import json
from datetime import datetime

import os
import sys

# Ensure apps/ai is on sys.path
ai_root = os.path.dirname(os.path.abspath(__file__))
if ai_root not in sys.path:
    sys.path.insert(0, ai_root)

# Force test DB so we don't need Postgres running locally for the manual verify
from config import settings
settings.DATABASE_URL = "sqlite+aiosqlite:///:memory:"

from core.database import reset_engine
reset_engine(settings.DATABASE_URL)
from core.database import get_session_factory
from models.base import Base
from ingestion.pipeline import IngestionPipeline
from providers.registry import ProviderRegistry, register_all_providers
from ingestion.sources.registry import register_all_sources

from models.event import ExtractedEvent
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def run_verification():
    # Setup test DB
    from core.database import reset_engine, get_engine, get_session_factory
    reset_engine(settings.DATABASE_URL)
    engine = get_engine()
    
    from models.base import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    register_all_providers()
    register_all_sources()
    
    # Needs a real API key for testing NewsAPI or FRED, if missing, use Trading Economics which might have a stub or public data. Wait, Trading Economics has a free news endpoint!
    # Let's run trading_economics
    
    Session = get_session_factory()
    async with Session() as db:
        nlp = ProviderRegistry.get_provider("spacy")
        pipeline = IngestionPipeline(db, nlp)
        
        print("Running pipeline for seed data...")
        summary = await pipeline.run("seed")
        print(f"Pipeline summary: {summary}")
        
        print("\n--- Extracted Events ---")
        stmt = select(ExtractedEvent).limit(5)
        res = await db.execute(stmt)
        events = res.scalars().all()
        
        for i, ev in enumerate(events):
            print(f"\nEvent {i+1}:")
            print(f"Title: {ev.title}")
            print(f"Summary: {ev.summary}")
            print(f"Category: {ev.category} / {ev.subtype}")
            print(f"Countries: {ev.countries}")
            print(f"Regions: {ev.regions}")
            print(f"Sectors: {ev.sectors}")
            print(f"Asset Classes: {ev.asset_classes}")
            print(f"Commodities: {ev.commodities}")
            print(f"Entities: Orgs: {ev.organizations}, People: {ev.people}")
            print(f"Severity: {ev.severity} | Confidence: {ev.overall_confidence}")
            print(f"Provenance: {ev.source_provider} | {ev.data_origin} | {ev.publication_timestamp}")
            
if __name__ == "__main__":
    asyncio.run(run_verification())
