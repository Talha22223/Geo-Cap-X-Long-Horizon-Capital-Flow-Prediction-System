"""
Tests for Ingestion Pipeline and source adapters.
"""
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ingestion.pipeline import IngestionPipeline
from providers.registry import ProviderRegistry
from models.event import RawEvent, ExtractedEvent
from ingestion.sources.registry import SourceRegistry


@pytest.mark.asyncio
async def test_seed_source_ingestion(db: AsyncSession):
    nlp = ProviderRegistry.get_provider("spacy")
    pipeline = IngestionPipeline(db, nlp)
    
    # Run pipeline with seed source
    summary = await pipeline.run("seed")
    
    assert summary["items_fetched"] > 0
    assert summary["events_ingested"] > 0
    assert summary["duplicates_skipped"] == 0

    # Verify rows in DB
    stmt_raw = select(RawEvent)
    res_raw = await db.execute(stmt_raw)
    raws = res_raw.scalars().all()
    assert len(raws) > 0

    stmt_ext = select(ExtractedEvent)
    res_ext = await db.execute(stmt_ext)
    exts = res_ext.scalars().all()
    assert len(exts) > 0


@pytest.mark.asyncio
async def test_csv_source_ingestion(db: AsyncSession):
    nlp = ProviderRegistry.get_provider("spacy")
    pipeline = IngestionPipeline(db, nlp)

    csv_data = "title,body,published_at,url,external_id\nFed raises rates,The Federal Reserve raised its policy benchmark rates today.,2025-06-12T12:00:00Z,http://csv.local,csv-1\n"
    
    summary = await pipeline.run("csv", csv_data=csv_data)
    assert summary["events_ingested"] == 1
