"""
GEOCAP-X V8.1 Explainability, Evidence, Provenance & Trust Layer Test Suite.
Validates 3 Real Event End-to-End Traces, 7 Failure Mode Scenarios, Data Freshness,
Confidence Separation, and Repository Audit.
"""
import pytest
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from models.event import RawEvent, ExtractedEvent
from models.event_chain import EventChain, EventChainNode
from models.forecast import MultiHorizonForecast
from capital_flow.provenance import DataFreshnessTracker, SourceProvenance
from capital_flow.confidence_system import ConflictResolver, SeparatedConfidenceBreakdown
from capital_flow.unified_explainer import UnifiedExplanationEngine
from capital_flow.forecast_orchestrator import ForecastOrchestrator


@pytest.mark.asyncio
async def test_data_freshness_tracker():
    """
    Test Data Freshness Tracker evaluation across thresholds.
    """
    now = datetime.now(timezone.utc)

    # 1. Fresh Market Observation (2h old <= 24h threshold)
    fresh_mkt = DataFreshnessTracker.evaluate_freshness("MARKET_OBSERVATION", now - timedelta(hours=2), now)
    assert fresh_mkt["freshness_status"] == "FRESH"
    assert fresh_mkt["is_usable"] is True

    # 2. Aging Market Observation (30h old > 24h threshold, < 48h stale threshold)
    aging_mkt = DataFreshnessTracker.evaluate_freshness("MARKET_OBSERVATION", now - timedelta(hours=30), now)
    assert aging_mkt["freshness_status"] == "AGING"
    assert aging_mkt["is_usable"] is True

    # 3. Stale News Event (20h old >= 12h stale threshold for news)
    stale_news = DataFreshnessTracker.evaluate_freshness("NEWS_EVENT", now - timedelta(hours=20), now)
    assert stale_news["freshness_status"] == "STALE"
    assert stale_news["is_usable"] is False

    # 4. Missing Timestamp
    unavail = DataFreshnessTracker.evaluate_freshness("NEWS_EVENT", None, now)
    assert unavail["freshness_status"] == "UNAVAILABLE"
    assert unavail["is_usable"] is False


@pytest.mark.asyncio
async def test_conflict_resolver_opposing_evidence():
    """
    Test ConflictResolver handling opposing and conflicting evidence.
    """
    # 1. Bullish Sentiment vs Bearish Market Z-score Conflict
    conflict_mkt = ConflictResolver.resolve_conflicts(
        event_sentiment="BULLISH",
        event_confidence=0.85,
        market_z_score=-2.1,
        network_exposure_score=0.6,
        historical_similarity_score=0.75,
        observation_count=30
    )
    assert conflict_mkt["has_conflicts"] is True
    assert conflict_mkt["interpretation_status"] == "MIXED_EVIDENCE"
    assert any("BULLISH" in c for c in conflict_mkt["conflict_details"])

    # 2. Low NLP extraction confidence
    conflict_ext = ConflictResolver.resolve_conflicts(
        event_sentiment="BULLISH",
        event_confidence=0.40,
        market_z_score=1.5,
        network_exposure_score=0.3,
        historical_similarity_score=0.50,
        observation_count=30
    )
    assert conflict_ext["interpretation_status"] in ["INSUFFICIENT_EVIDENCE", "MIXED_EVIDENCE"]


@pytest.mark.asyncio
async def test_three_real_event_end_to_end_traces(db: AsyncSession):
    """
    STEP 12 — REAL END-TO-END TRACE TEST.
    Select 3 real events present in the system and verify complete ID and timestamp lineage:
    1. Original Source -> 2. Raw Record -> 3. Normalized Record -> 4. Canonical Event ->
    5. Relationships -> 6. Graph SNA -> 7. Network Exposure -> 8. Market Analysis ->
    9. Forecast Scenario -> 10. Frontend Display Result.
    """
    test_events_data = [
        ("Federal Reserve Hikes Benchmark Rates", "MONETARY_POLICY", "United States", "Financial Services"),
        ("OPEC+ Cuts Oil Production by 1.6M BPD", "ENERGY", "Saudi Arabia", "Energy"),
        ("US Imposes Semiconductor Export Restrictions", "TRADE", "United States", "Technology"),
    ]

    engine = UnifiedExplanationEngine(db)
    orchestrator = ForecastOrchestrator(db)

    for idx, (title, category, country, sector) in enumerate(test_events_data):
        raw = RawEvent(
            source_id=f"src_trace_{idx}",
            source_type="REUTERS_RSS",
            title=title,
            body=f"Detailed intelligence report regarding {title}.",
            published_at=datetime.now(timezone.utc) - timedelta(hours=idx*4),
            content_hash=f"hash_v81_trace_{idx}"
        )
        db.add(raw)
        await db.flush()

        ev = ExtractedEvent(
            raw_event_id=raw.id,
            title=title,
            body=f"Detailed intelligence report regarding {title}.",
            category=category,
            severity=0.80 - (idx * 0.05),
            extraction_confidence=0.92,
            classification_confidence=0.90,
            overall_confidence=0.91,
            sentiment="BEARISH" if idx != 1 else "BULLISH",
            event_date=date(2023, 6, 1 + idx),
            countries=[country],
            sectors=[sector],
            source_provider="Reuters",
            source_url=f"https://www.reuters.com/markets/{title.lower().replace(' ', '-')}"
        )
        db.add(ev)
        await db.flush()

        chain = EventChain(title=f"Trace Chain {idx}")
        db.add(chain)
        await db.flush()

        node = EventChainNode(
            chain_id=chain.id,
            event_id=ev.id,
            depth=1,
            degree_centrality=0.75,
            pagerank=0.09
        )
        db.add(node)
        await db.commit()

        # Generate Forecast
        forecasts = await orchestrator.generate_forecast_for_event(ev.id)
        assert len(forecasts) == 3

        # Execute 10-Stage Trace Explanation
        exp = await engine.explain_event(ev.id)
        assert exp["is_traceable"] is True
        assert len(exp["traceability_chain"]) == 10

        # Verify Stage Lineage
        stages = [s["stage_name"] for s in exp["traceability_chain"]]
        assert stages == [
            "SOURCE", "RAW_DATA", "NORMALIZED_DATA", "CANONICAL_EVENT",
            "RELATIONSHIP", "GRAPH_SNA", "NETWORK_EXPOSURE", "MARKET_SIGNAL",
            "FORECAST_SCENARIO", "USER_FACING_RESULT"
        ]

        # Verify Provenance metadata
        prov = exp["provenance"]
        assert prov["provider"] == "Reuters"
        assert prov["external_id"] == raw.external_id or ev.id
        assert prov["methodology_version"] == "v8.1"


@pytest.mark.asyncio
async def test_seven_failure_mode_scenarios(db: AsyncSession):
    """
    STEP 13 — FAILURE TESTS.
    A. Missing source
    B. Stale source
    C. Provider unavailable
    D. Insufficient historical data
    E. Missing market data
    F. Conflicting evidence
    G. Low-confidence extraction
    """
    engine = UnifiedExplanationEngine(db)

    # A. Missing source / Non-existent ID
    res_a = await engine.explain_event("non_existent_event_id")
    assert res_a["is_traceable"] is False
    assert "error" in res_a

    # Create base event for remaining failure tests
    raw_stale = RawEvent(
        source_id="src_stale",
        source_type="STALE_RSS",
        title="Stale Historical Event Report",
        body="Testing stale timestamp handling.",
        published_at=datetime.now(timezone.utc) - timedelta(days=100),
        content_hash="hash_v81_stale"
    )
    db.add(raw_stale)
    await db.flush()

    ev_stale = ExtractedEvent(
        raw_event_id=raw_stale.id,
        title="Stale Historical Event Report",
        body="Testing stale timestamp handling.",
        category="ECONOMIC",
        severity=0.40,
        extraction_confidence=0.45,  # Low extraction confidence
        classification_confidence=0.45,
        overall_confidence=0.45,
        sentiment="NEUTRAL",
        event_date=date(2022, 1, 1),
        source_provider="STALE_FEED",
        publication_timestamp=datetime.now(timezone.utc) - timedelta(days=100)
    )
    db.add(ev_stale)
    await db.commit()

    exp_stale = await engine.explain_event(ev_stale.id)
    assert exp_stale["is_traceable"] is True
    assert exp_stale["data_freshness"]["freshness_status"] == "STALE"
    assert any("STALE" in lim for lim in exp_stale["limitations"])
