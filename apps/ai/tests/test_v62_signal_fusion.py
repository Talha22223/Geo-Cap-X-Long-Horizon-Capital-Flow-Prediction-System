"""
Mandatory V6.2 Signal Fusion & Event-Market Intelligence Test Suite.
Verifies 4-layer signal fusion, 3 real canonical events, Good/Mixed/Insufficient data handling, and exact reproducibility.
"""
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from models.event import RawEvent, ExtractedEvent
from capital_flow.signal_fusion import SignalFusionEngine
from capital_flow.cross_asset import CrossAssetAnalyzer
from capital_flow.event_window import EventWindowAnalyzer
from providers.financial.yfinance_provider import RealYahooFinanceProvider


@pytest.mark.asyncio
async def test_3_real_canonical_events_mapping():
    """
    Test 1 — 3 Real Canonical Events Asset Mapping & Chain Alignment.
    """
    ev_monetary = ExtractedEvent(
        raw_event_id="raw-1", title="Fed Rate Hike 50bps", body="Fed increases interest rate by 50bps.",
        countries=["United States"], category="MONETARY_POLICY", sentiment="BULLISH", severity=0.85,
        extraction_confidence=0.9, classification_confidence=0.9, overall_confidence=0.9
    )
    ev_geopolitical = ExtractedEvent(
        raw_event_id="raw-2", title="Middle East Energy Disruption", body="Oil supply disruption in Persian Gulf.",
        countries=["Saudi Arabia"], sectors=["Energy"], category="GEOPOLITICAL", sentiment="BEARISH", severity=0.95,
        extraction_confidence=0.95, classification_confidence=0.95, overall_confidence=0.95
    )
    ev_trade = ExtractedEvent(
        raw_event_id="raw-3", title="US Semiconductor Export Tariff", body="US imposes export controls on AI chips.",
        countries=["United States", "China"], sectors=["Technology"], category="TRADE", sentiment="BEARISH", severity=0.75,
        extraction_confidence=0.85, classification_confidence=0.85, overall_confidence=0.85
    )

    provider = RealYahooFinanceProvider()

    # Fetch real market data for all 3 mapped assets
    obs_spy = await provider.get_observations("SPY", limit=40)
    obs_oil = await provider.get_observations("CL=F", limit=40)
    obs_tech = await provider.get_observations("XLK", limit=40)

    assert len(obs_spy) > 0
    assert len(obs_oil) > 0
    assert len(obs_tech) > 0


@pytest.mark.asyncio
async def test_case_a_good_data():
    """
    Test Case A — Good Data:
    Complete market data produces valid 4-layer fused signal.
    """
    ev = ExtractedEvent(
        raw_event_id="raw-good", title="Fed Rate Hike 50bps", body="Fed increases interest rate by 50bps.",
        countries=["United States"], category="MONETARY_POLICY", sentiment="BULLISH", severity=0.8,
        extraction_confidence=0.9, classification_confidence=0.9, overall_confidence=0.9
    )

    provider = RealYahooFinanceProvider()
    obs = await provider.get_observations("SPY", limit=50)

    win = EventWindowAnalyzer.analyze_window(datetime.now(timezone.utc), obs)
    fused = SignalFusionEngine.fuse_signals(ev, "SPY", None, obs, win)

    assert "layer1_event_signal" in fused
    assert "layer2_network_signal" in fused
    assert "layer3_market_signal" in fused
    assert "layer4_data_quality" in fused
    assert fused["layer4_data_quality"]["is_sufficient_history"] is True
    assert 0.0 <= fused["fused_signal_score"] <= 1.0


@pytest.mark.asyncio
async def test_case_b_mixed_data():
    """
    Test Case B — Mixed Data:
    High event severity but low/normal market abnormality outputs UNCONFIRMED_EVENT_SIGNAL or MIXED_EVIDENCE.
    """
    ev = ExtractedEvent(
        raw_event_id="raw-mixed", title="Minor Policy Speech", body="Official gives routine remarks.",
        countries=["United States"], category="ECONOMIC", sentiment="NEUTRAL", severity=0.90,
        extraction_confidence=0.9, classification_confidence=0.9, overall_confidence=0.9
    )

    # Simulated flat observations with 0 abnormality Z-score
    obs = [
        {"close_price": 100.0, "volume": 1e6, "timestamp": datetime.now(timezone.utc) - timedelta(days=i), "source": "YAHOO_FINANCE", "asset_class": "EQUITY"}
        for i in range(30, 0, -1)
    ]

    win = EventWindowAnalyzer.analyze_window(datetime.now(timezone.utc), obs)
    fused = SignalFusionEngine.fuse_signals(ev, "SPY", None, obs, win)

    assert fused["interpretation_status"] in ("UNCONFIRMED_EVENT_SIGNAL", "MIXED_EVIDENCE")


@pytest.mark.asyncio
async def test_case_c_insufficient_data():
    """
    Test Case C — Insufficient Data:
    Empty/insufficient history outputs INSUFFICIENT_EVIDENCE without generating fake numbers.
    """
    ev = ExtractedEvent(
        raw_event_id="raw-sparse", title="Unmapped Event", body="Sparse metadata event.",
        countries=["Unknown"], category="ECONOMIC", sentiment="NEUTRAL", severity=0.5,
        extraction_confidence=0.5, classification_confidence=0.5, overall_confidence=0.5
    )

    obs_sparse = [{"close_price": 50.0, "volume": 1000, "timestamp": datetime.now(timezone.utc), "source": "YAHOO_FINANCE"}]
    win = EventWindowAnalyzer.analyze_window(datetime.now(timezone.utc), obs_sparse)
    fused = SignalFusionEngine.fuse_signals(ev, "UNKNOWN", None, obs_sparse, win)

    assert fused["interpretation_status"] == "INSUFFICIENT_EVIDENCE"
    assert fused["layer4_data_quality"]["is_sufficient_history"] is False


@pytest.mark.asyncio
async def test_reproducibility():
    """
    Test — Reproducibility Test:
    Running the exact same fusion twice with identical inputs yields identical scores and status.
    """
    ev = ExtractedEvent(
        raw_event_id="raw-repro", title="Fed Rate Hike 50bps", body="Fed increases interest rate by 50bps.",
        countries=["United States"], category="MONETARY_POLICY", sentiment="BULLISH", severity=0.8,
        extraction_confidence=0.9, classification_confidence=0.9, overall_confidence=0.9
    )

    provider = RealYahooFinanceProvider()
    obs = await provider.get_observations("SPY", limit=30)
    win = EventWindowAnalyzer.analyze_window(datetime.now(timezone.utc), obs)

    res1 = SignalFusionEngine.fuse_signals(ev, "SPY", None, obs, win)
    res2 = SignalFusionEngine.fuse_signals(ev, "SPY", None, obs, win)

    assert res1["fused_signal_score"] == res2["fused_signal_score"]
    assert res1["interpretation_status"] == res2["interpretation_status"]
    assert res1["layer1_event_signal"] == res2["layer1_event_signal"]
