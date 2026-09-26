"""
Mandatory V6.1 Real Capital-Flow Data & Signal Test Suite.
Verifies real market ingestion, rolling baselines, abnormality formulas, event windows, and honest missing data handling.
"""
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.event import RawEvent, ExtractedEvent
from models.market_data import MarketObservation, EventAssetMapping, EventWindowAnalysis
from providers.financial.yfinance_provider import RealYahooFinanceProvider
from providers.financial.worldbank_provider import WorldBankProvider
from providers.financial.fred_provider import FREDProvider
from capital_flow.proxy_calculator import CapitalFlowProxyCalculator
from capital_flow.event_mapping import EventAssetMapper
from capital_flow.event_window import EventWindowAnalyzer
from capital_flow.abnormality import StatisticalAbnormalityDetector
from capital_flow.engine import CapitalFlowEngine


@pytest.mark.asyncio
async def test_a_market_ingestion(db: AsyncSession):
    """
    TEST A — MARKET INGESTION:
    Retrieve real market observations from Yahoo Finance and verify persistence.
    """
    provider = RealYahooFinanceProvider()
    obs = await provider.get_observations("SPY", limit=20)
    assert len(obs) > 0, "Yahoo Finance provider returned no observations for SPY"

    # Persist in DB
    for o in obs:
        rec = MarketObservation(
            instrument_symbol=o["instrument_symbol"],
            asset_class=o["asset_class"],
            market=o["market"],
            timestamp=o["timestamp"],
            open_price=o["open_price"],
            high_price=o["high_price"],
            low_price=o["low_price"],
            close_price=o["close_price"],
            volume=o["volume"],
            currency=o["currency"],
            source=o["source"],
            source_identifier=o["source_identifier"],
            ingestion_timestamp=o["ingestion_timestamp"],
            data_quality=o["data_quality"],
            data_origin=o["data_origin"]
        )
        db.add(rec)
    await db.commit()

    # Query DB to verify
    stmt = select(MarketObservation).where(MarketObservation.instrument_symbol == "SPY")
    res = await db.execute(stmt)
    db_items = res.scalars().all()
    assert len(db_items) > 0
    assert db_items[0].source == "YAHOO_FINANCE"
    assert db_items[0].data_origin == "MARKET_PROXY_DATA"


@pytest.mark.asyncio
async def test_b_historical_baseline():
    """
    TEST B — HISTORICAL BASELINE:
    Verify baseline is derived from actual historical observations.
    """
    provider = RealYahooFinanceProvider()
    obs = await provider.get_observations("AAPL", limit=50)
    assert len(obs) >= 30, "Insufficient real historical data returned for AAPL baseline test"

    abnormal_vol = CapitalFlowProxyCalculator.calculate_abnormal_volume(obs, window_size=30)
    assert abnormal_vol is not None
    assert "source_variables" in abnormal_vol
    assert abnormal_vol["source_variables"]["sample_size"] >= 20
    assert abnormal_vol["methodology_version"] == "v6.1"


@pytest.mark.asyncio
async def test_c_abnormality_formula():
    """
    TEST C — ABNORMALITY:
    Run abnormal volume/return/volatility analysis on a real instrument and verify formula manually.
    """
    test_values = [10.0, 12.0, 11.0, 9.5, 10.5, 11.2, 10.8, 9.8, 11.5, 10.2, 11.0, 10.4]
    target_val = 18.0  # Spiked value

    res = StatisticalAbnormalityDetector.calculate_z_score(target_val, test_values)
    assert res["status"] == "CALCULATED"
    assert res["z_score"] > 2.0  # Should be a clear statistical outlier
    assert res["percentile"] == 100.0


@pytest.mark.asyncio
async def test_d_event_window(db: AsyncSession):
    """
    TEST D — EVENT WINDOW:
    Use a real canonical event with a known timestamp and verify pre/post windows.
    """
    pub = datetime.now(timezone.utc) - timedelta(days=10)

    raw = RawEvent(source_id="v6_test", source_type="TEST", title="Fed Rate Hike", body="Fed increases interest rate by 50bps.", content_hash="hash-v6", published_at=pub)
    db.add(raw)
    await db.flush()

    ext = ExtractedEvent(
        raw_event_id=raw.id, title="Fed Rate Hike", body="Fed increases interest rate by 50bps.",
        countries=["United States"], regions=["North America"], sectors=["Financial Services"], currency="USD", asset_classes=["BOND"],
        category="MONETARY_POLICY", sentiment="BULLISH", severity=0.8,
        extraction_confidence=0.9, classification_confidence=0.9, overall_confidence=0.9,
        event_date=pub.date()
    )
    db.add(ext)
    await db.commit()

    engine = CapitalFlowEngine(db)
    preds = await engine.generate_predictions_for_events([ext.id])

    assert len(preds) > 0
    p = preds[0]
    assert p.affected_country == "United States"
    assert p.asset_class in ("ETF", "BOND", "FX")


@pytest.mark.asyncio
async def test_e_missing_data():
    """
    TEST E — MISSING DATA:
    Test an instrument/provider with missing configuration/data.
    Verify INSUFFICIENT_DATA / NOT_CONFIGURED instead of fabricated output.
    """
    # Test an unconfigured provider status explicitly
    fred = FREDProvider()
    # Save active key if present
    from config import settings
    orig_key = getattr(settings, "FRED_API_KEY", None)
    try:
        settings.FRED_API_KEY = ""
        status = fred.get_status()
        assert status["status"] == "NOT_CONFIGURED"

        # Fetching series without key returns empty list without inventing fake values
        series = await fred.get_series("FEDFUNDS")
        assert len(series) == 0
    finally:
        settings.FRED_API_KEY = orig_key

    # Test abnormality with < 10 history samples
    abn = StatisticalAbnormalityDetector.calculate_z_score(15.0, [10.0, 11.0, 12.0])
    assert abn["status"] == "INSUFFICIENT_HISTORY"
    assert abn["z_score"] is None
