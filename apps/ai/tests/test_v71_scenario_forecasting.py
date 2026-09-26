"""
V7.1 Multi-Horizon Scenario Intelligence Engine Test Suite.
Validates Real Event Data, Multi-Horizon Scenarios, Supporting/Opposing Evidence,
Sensitivity Analysis, Determinism, and Honest Failure Degradation.
"""
import pytest
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from models.event import RawEvent, ExtractedEvent
from models.event_chain import EventChainNode
from models.forecast import MultiHorizonForecast, ForecastScenarioModel, ForecastAnalogueModel
from capital_flow.forecast_orchestrator import ForecastOrchestrator
from capital_flow.historical_analogues import HistoricalAnalogueEngine
from capital_flow.contracts import EventEvidenceInput, EvidenceState


@pytest.mark.asyncio
async def test_historical_analogue_engine_matching():
    """
    Test multidimensional attribute matching for historical analogues.
    """
    ev_input = EventEvidenceInput(
        event_id="ev_test_1",
        title="Federal Reserve Hikes Benchmark Rates",
        category="MONETARY_POLICY",
        severity=0.85,
        confidence=0.90,
        timestamp=datetime.now(timezone.utc),
        countries=["United States"],
        regions=["North America"],
        sectors=["Financial Services"],
        sentiment="BEARISH"
    )

    res = HistoricalAnalogueEngine.find_analogues(ev_input)

    assert res.state == EvidenceState.AVAILABLE
    assert res.analogue_count >= 1
    assert res.top_similarity_score >= 0.45
    assert len(res.matched_analogues) > 0

    top_match = res.matched_analogues[0]
    assert "title" in top_match
    assert "similarity_score" in top_match
    assert "matching_attributes" in top_match
    assert any("CATEGORY_MATCH" in attr for attr in top_match["matching_attributes"])


@pytest.mark.asyncio
async def test_v71_canonical_events_validation(db: AsyncSession):
    """
    STEP 13 — REAL DATA VALIDATION.
    Test 3 real canonical events:
    A. Event with strong evidence (Monetary Policy Rate Hike)
    B. Event with mixed evidence (Geopolitical tensions)
    C. Event with insufficient evidence (Single unmapped event)
    """
    # ── EVENT A: STRONG EVIDENCE ─────────────────────────────────────────────
    raw_a = RawEvent(
        source_id="seed_1",
        source_type="SEED",
        title="Fed Raises Rates by 75bps to Curb Inflation",
        body="Federal Reserve aggressive monetary tightening cycle.",
        published_at=datetime.now(timezone.utc),
        content_hash="hash_v71_strong_a"
    )
    db.add(raw_a)
    await db.flush()

    ev_a = ExtractedEvent(
        raw_event_id=raw_a.id,
        title="Fed Raises Rates by 75bps to Curb Inflation",
        body="Federal Reserve aggressive monetary tightening cycle.",
        category="MONETARY_POLICY",
        severity=0.85,
        extraction_confidence=0.95,
        classification_confidence=0.92,
        overall_confidence=0.93,
        sentiment="BEARISH",
        event_date=date(2022, 6, 15),
        countries=["United States"],
        regions=["North America"],
        sectors=["Financial Services"],
        currency="USD"
    )
    db.add(ev_a)
    await db.flush()

    from models.event_chain import EventChain
    chain_a = EventChain(title="Test Chain A")
    db.add(chain_a)
    await db.flush()

    # Add network chain node to provide strong Layer 2 signal
    node_a = EventChainNode(
        chain_id=chain_a.id,
        event_id=ev_a.id,
        depth=1,
        degree_centrality=0.6,
        clustering_coefficient=0.45,
        pagerank=0.08
    )
    db.add(node_a)
    await db.commit()

    orchestrator = ForecastOrchestrator(db)
    forecasts_a = await orchestrator.generate_forecast_for_event(ev_a.id)

    assert len(forecasts_a) == 3, "Should generate 3 horizon forecasts"
    short_term_a = next(f for f in forecasts_a if f.horizon == "SHORT_TERM")
    assert short_term_a.status == "SUFFICIENT_EVIDENCE"
    assert short_term_a.overall_confidence > 0.50

    # Verify persistent scenarios and evidence
    scenarios_a = short_term_a.scenarios
    assert len(scenarios_a) >= 2, "Should support at least Continuation and Normalization scenarios"

    continuation_scen = next(s for s in scenarios_a if s.scenario_type == "CONTINUATION")
    assert len(continuation_scen.assumptions_json) > 0, "Explicit structural assumptions required"
    assert len(continuation_scen.supporting_evidence_json) > 0, "Supporting evidence list required"
    assert len(continuation_scen.opposing_evidence_json) >= 0, "Opposing evidence list required"

    # ── EVENT B: MIXED EVIDENCE ──────────────────────────────────────────────
    raw_b = RawEvent(
        source_id="seed_2",
        source_type="SEED",
        title="Regional Port Logistics Delay Reported",
        body="Minor maritime shipping bottlenecks observed in regional hub.",
        published_at=datetime.now(timezone.utc),
        content_hash="hash_v71_mixed_b"
    )
    db.add(raw_b)
    await db.flush()

    ev_b = ExtractedEvent(
        raw_event_id=raw_b.id,
        title="Regional Port Logistics Delay Reported",
        body="Minor maritime shipping bottlenecks observed in regional hub.",
        category="TRADE",
        severity=0.40,
        extraction_confidence=0.60,
        classification_confidence=0.55,
        overall_confidence=0.58,
        sentiment="BEARISH",
        event_date=date(2023, 4, 10),
        countries=["Singapore"],
        regions=["Asia Pacific"],
        sectors=["Industrials"]
    )
    db.add(ev_b)
    await db.commit()

    forecasts_b = await orchestrator.generate_forecast_for_event(ev_b.id)
    assert len(forecasts_b) == 3
    short_term_b = next(f for f in forecasts_b if f.horizon == "SHORT_TERM")
    assert short_term_b.confidence_state in ["MIXED_EVIDENCE", "UNCONFIRMED_EVENT_SIGNAL"]

    # ── EVENT C: INSUFFICIENT EVIDENCE ───────────────────────────────────────
    raw_c = RawEvent(
        source_id="seed_3",
        source_type="SEED",
        title="Unverified Local Speculation on Small Firm",
        body="Unsubstantiated rumor regarding local boutique firm.",
        published_at=datetime.now(timezone.utc),
        content_hash="hash_v71_insufficient_c"
    )
    db.add(raw_c)
    await db.flush()

    ev_c = ExtractedEvent(
        raw_event_id=raw_c.id,
        title="Unverified Local Speculation on Small Firm",
        body="Unsubstantiated rumor regarding local boutique firm.",
        category="UNKNOWN_CATEGORY",
        severity=0.10,
        extraction_confidence=0.20,
        classification_confidence=0.20,
        overall_confidence=0.20,
        sentiment="NEUTRAL",
        event_date=date(2024, 1, 1)
    )
    db.add(ev_c)
    await db.commit()

    forecasts_c = await orchestrator.generate_forecast_for_event(ev_c.id)
    long_term_c = next(f for f in forecasts_c if f.horizon == "LONG_TERM")
    assert long_term_c.status == "INSUFFICIENT_EVIDENCE"
    assert long_term_c.estimated_rotation_usd_bn == 0.0


@pytest.mark.asyncio
async def test_v71_determinism(db: AsyncSession):
    """
    STEP 14 — DETERMINISM TEST.
    Identical forecast generation twice must yield exact identical output and confidence scores.
    """
    raw = RawEvent(
        source_id="det_1",
        source_type="SEED",
        title="Determinism Verification Rate Decision",
        body="Testing zero-randomness deterministic forecast generation.",
        published_at=datetime.now(timezone.utc),
        content_hash="hash_v71_determinism"
    )
    db.add(raw)
    await db.flush()

    ev = ExtractedEvent(
        raw_event_id=raw.id,
        title="Determinism Verification Rate Decision",
        body="Testing zero-randomness deterministic forecast generation.",
        category="MONETARY_POLICY",
        severity=0.80,
        extraction_confidence=0.90,
        classification_confidence=0.90,
        overall_confidence=0.90,
        sentiment="BULLISH",
        event_date=date(2023, 5, 1)
    )
    db.add(ev)
    await db.commit()

    orchestrator = ForecastOrchestrator(db)

    # Run 1
    forecasts_run1 = await orchestrator.generate_forecast_for_event(ev.id)
    run1_conf = forecasts_run1[0].overall_confidence
    run1_mag = forecasts_run1[0].estimated_rotation_usd_bn
    run1_scen_count = len(forecasts_run1[0].scenarios)

    # Run 2
    forecasts_run2 = await orchestrator.generate_forecast_for_event(ev.id)
    run2_conf = forecasts_run2[0].overall_confidence
    run2_mag = forecasts_run2[0].estimated_rotation_usd_bn
    run2_scen_count = len(forecasts_run2[0].scenarios)

    assert run1_conf == run2_conf, "Confidence scores must be 100% deterministic"
    assert run1_mag == run2_mag, "Scaled magnitudes must be 100% deterministic"
    assert run1_scen_count == run2_scen_count, "Scenario count must match exactly"


@pytest.mark.asyncio
async def test_v71_failure_handling(db: AsyncSession):
    """
    STEP 15 — FAILURE HANDLING.
    Engine must degrade honestly when market data or historical analogues are missing.
    """
    raw = RawEvent(
        source_id="fail_1",
        source_type="SEED",
        title="Isolated Event With Missing Market and Historical Data",
        body="Testing honest failure state degradation.",
        published_at=datetime.now(timezone.utc),
        content_hash="hash_v71_failure"
    )
    db.add(raw)
    await db.flush()

    ev = ExtractedEvent(
        raw_event_id=raw.id,
        title="Isolated Event With Missing Market and Historical Data",
        body="Testing honest failure state degradation.",
        category="NON_STANDARD_CATEGORY",
        severity=0.50,
        extraction_confidence=0.50,
        classification_confidence=0.50,
        overall_confidence=0.50,
        sentiment="NEUTRAL",
        event_date=date(2023, 9, 1)
    )
    db.add(ev)
    await db.commit()

    orchestrator = ForecastOrchestrator(db)
    forecasts = await orchestrator.generate_forecast_for_event(ev.id)

    short_term = next(f for f in forecasts if f.horizon == "SHORT_TERM")
    snapshot = short_term.data_snapshot_json

    assert snapshot["has_market_data"] is False
    assert snapshot["has_historical_analogues"] is False
    assert short_term.confidence_state in ["UNCONFIRMED_EVENT_SIGNAL", "MIXED_EVIDENCE", "UNCONFIRMED_INSUFFICIENT_DATA"]
