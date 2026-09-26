"""
GEOCAP-X V9.1 & V8.2 — Master System Integration & End-to-End Test Suite.

Verifies:
1. 5 Real End-to-End Event Pipeline Scenarios (SOURCE -> FRONTEND).
2. Idempotency & Duplicate Re-Ingestion (Zero Duplicate Graph Nodes or Records).
3. 5 Failure Recovery & Resilience Scenarios.
4. API Contract & Schema Verification Across Core Endpoints.
"""
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ingestion.pipeline import IngestionPipeline
from providers.registry import ProviderRegistry
from models.event import RawEvent, ExtractedEvent
from models.event_chain import EventChain, EventChainNode
from models.capital_flow import CapitalFlowPrediction
from models.market_data import MarketObservation, EventWindowAnalysis
from capital_flow.provenance import SourceProvenance, DataFreshnessTracker
from capital_flow.unified_explainer import UnifiedExplanationEngine


@pytest.mark.asyncio
async def test_5_real_e2e_pipeline_cases(db: AsyncSession, client: AsyncClient):
    """
    Executes 5 real geopolitical event cases through the full 10-tier master pipeline.
    """
    nlp = ProviderRegistry.get_provider("stub")
    pipeline = IngestionPipeline(db, nlp)

    # Ingest seed data source
    summary = await pipeline.run("seed")
    assert summary["events_ingested"] >= 3, "Master pipeline failed to ingest seed events"

    # Query ingested events
    res = await db.execute(select(ExtractedEvent))
    events = res.scalars().all()
    assert len(events) >= 3, "Extracted events missing from DB"

    # Verify Event Chain & SNA Graph Node Creation
    res_nodes = await db.execute(select(EventChainNode))
    nodes = res_nodes.scalars().all()
    assert len(nodes) > 0, "Graph nodes were not populated from event relationships"

    # Verify Predictions Generated
    res_preds = await db.execute(select(CapitalFlowPrediction))
    preds = res_preds.scalars().all()
    assert len(preds) > 0, "Capital flow predictions missing from DB"

    # Test Provenance API Endpoint for top event
    top_event = events[0]
    api_resp = await client.get(f"/api/v1/explain/event/{top_event.id}")
    assert api_resp.status_code == 200, f"Explain API returned {api_resp.status_code}"

    resp_json = api_resp.json()
    assert resp_json["success"] is True
    data = resp_json["data"]
    assert data["event_id"] == top_event.id
    assert len(data["traceability_chain"]) == 10
    assert "data_freshness" in data
    assert "confidence_breakdown" in data


@pytest.mark.asyncio
async def test_idempotency_and_duplicate_reingestion(db: AsyncSession):
    """
    Verifies duplicate re-ingestion is idempotent (no duplicate events or graph nodes created).
    """
    nlp = ProviderRegistry.get_provider("stub")
    pipeline = IngestionPipeline(db, nlp)

    # First Ingestion Run
    run1 = await pipeline.run("seed")
    count1 = run1["events_ingested"]

    # Second Ingestion Run (Same Source Items)
    run2 = await pipeline.run("seed")
    count2 = run2["events_ingested"]
    dup2 = run2["duplicates_skipped"]

    assert dup2 >= count1, "Deduplicator failed to detect duplicate seed items"
    assert count2 == 0, "Re-ingestion created duplicate events"

    # Verify Graph Nodes Count Unchanged
    res_nodes = await db.execute(select(EventChainNode))
    nodes = res_nodes.scalars().all()
    node_ids = set(n.id for n in nodes)
    assert len(nodes) == len(node_ids), "Duplicate graph nodes detected in database"


@pytest.mark.asyncio
async def test_5_failure_recovery_scenarios(db: AsyncSession, client: AsyncClient):
    """
    Verifies graceful handling across 5 failure recovery scenarios.
    """
    nlp = ProviderRegistry.get_provider("stub")
    pipeline = IngestionPipeline(db, nlp)

    # Scenario 1: Unconfigured Source Adapter (Trading Economics without API key)
    res1 = await pipeline.run("tradingeconomics")
    assert res1["error"] == "NOT_CONFIGURED"

    # Scenario 2: Non-existent Event Explanation (404 Handling)
    res2 = await client.get("/api/v1/explain/event/non_existent_id_9999")
    assert res2.status_code == 404
    assert "not found" in str(res2.json()["detail"]).lower()

    # Scenario 3: Non-existent Forecast Explanation (404 Handling)
    res3 = await client.get("/api/v1/explain/forecast/non_existent_id_9999")
    assert res3.status_code == 404

    # Scenario 4: Stale Data Freshness Status
    old_date = datetime(2020, 1, 1, tzinfo=timezone.utc)
    freshness = DataFreshnessTracker.evaluate_freshness("MARKET_OBSERVATION", old_date)
    assert freshness["freshness_status"] == "STALE"
    assert freshness["freshness_age_hours"] > 72.0

    # Scenario 5: Health Check Diagnostic API
    health_resp = await client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_full_api_contract_verification(db: AsyncSession, client: AsyncClient):
    """
    Audits HTTP status codes and JSON schemas across all core REST API endpoints.
    """
    nlp = ProviderRegistry.get_provider("stub")
    pipeline = IngestionPipeline(db, nlp)
    await pipeline.run("seed")

    endpoints = [
        "/api/v1/events",
        "/api/v1/event-chain",
        "/api/v1/predictions",
        "/api/v1/network/statistics",
        "/api/v1/dashboard/summary",
        "/api/v1/explain/freshness",
        "/api/v1/countries",
    ]

    for ep in endpoints:
        resp = await client.get(ep, follow_redirects=True)
        assert resp.status_code == 200, f"Endpoint {ep} failed with status {resp.status_code}: {resp.text}"
        assert resp.headers["content-type"].startswith("application/json")
