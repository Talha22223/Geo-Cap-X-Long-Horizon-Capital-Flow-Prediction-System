"""
Tests for the Technical Analysis, Market Structure, Pattern Detection, and XAI Explanations.
"""
import pytest
from httpx import AsyncClient
from technical.market_data import SimulatedOHLCVProvider
from technical.indicators import TechnicalIndicators
from technical.market_structure import MarketStructureDetector
from technical.patterns import PatternDetector
from technical.multi_timeframe import MultiTimeframeAnalyzer
from technical.engine import TechnicalAnalysisEngine
from technical.explainer import TechnicalExplainer


@pytest.mark.asyncio
async def test_market_data_simulation():
    provider = SimulatedOHLCVProvider()
    ohlcv = await provider.get_ohlcv("AAPL", "1D", limit=50)
    assert len(ohlcv) == 50
    for bar in ohlcv:
        assert "open" in bar
        assert "high" in bar
        assert "low" in bar
        assert "close" in bar
        assert "volume" in bar
        assert bar["high"] >= bar["low"]
        assert bar["close"] > 0.0


@pytest.mark.asyncio
async def test_technical_indicators():
    provider = SimulatedOHLCVProvider()
    ohlcv = await provider.get_ohlcv("AAPL", "1D", limit=100)
    
    indicators = TechnicalIndicators.compute_all(ohlcv)
    assert "sma_20" in indicators
    assert "ema_9" in indicators
    assert "rsi_14" in indicators
    assert "macd" in indicators
    assert "bollinger_bands" in indicators
    assert "atr_14" in indicators
    assert "vwap" in indicators
    assert "obv" in indicators
    assert "adx" in indicators
    assert "stoch_rsi" in indicators
    assert "ichimoku" in indicators
    assert "fibonacci" in indicators
    assert "volume_profile" in indicators
    
    # Test values
    assert len(indicators["sma_20"]) == 100
    assert len(indicators["ema_9"]) == 100
    assert len(indicators["rsi_14"]) == 100


def test_market_structure_detector():
    # Simple mock data to test pivots
    highs = [10.0, 11.0, 12.0, 11.0, 10.0, 9.0, 8.0, 9.0, 10.0, 9.0, 8.0]
    lows = [9.0, 10.0, 11.0, 10.0, 9.0, 8.0, 7.0, 8.0, 9.0, 8.0, 7.0]
    
    pivots = MarketStructureDetector.detect_pivots(highs, lows, window=2)
    assert "swing_highs" in pivots
    assert "swing_lows" in pivots
    
    trend_data = MarketStructureDetector.classify_trend_and_structure(highs, lows, window=2)
    assert "trend" in trend_data
    assert "swing_highs" in trend_data
    
    sr = MarketStructureDetector.detect_support_resistance(highs, lows, window=2)
    assert isinstance(sr, list)
    
    strength = MarketStructureDetector.calculate_trend_strength([20.0, 25.0, 30.0])
    assert strength == 25.0


def test_pattern_detector():
    # Simple simulated Double Top
    # Price rises to peak 1, drops to valley, rises to peak 2 (same price), drops below valley
    closes = [10.0, 11.0, 12.0, 11.0, 10.0, 11.0, 12.0, 9.5]
    highs = closes
    lows = [c - 0.5 for c in closes]
    ohlcv = []
    for i in range(len(closes)):
        ohlcv.append({
            "open": closes[i], "high": highs[i], "low": lows[i], "close": closes[i], "volume": 1000.0
        })
    # Since window=1, we can detect a Double Top
    sh = [{"index": 2, "price": 12.0}, {"index": 6, "price": 12.0}]
    sl = [{"index": 4, "price": 10.0}]
    
    dt = PatternDetector._detect_double_top(closes, sh, sl, tolerance=0.05)
    assert dt.found is True
    assert dt.pattern_name == "Double Top"
    assert dt.pattern_type == "BEARISH"


def test_multi_timeframe_alignment():
    trends = {
        "1H": "BULLISH",
        "4H": "BULLISH",
        "1D": "BULLISH",
        "1W": "NEUTRAL",
        "1M": "BULLISH"
    }
    res = MultiTimeframeAnalyzer.analyze_alignment(trends)
    assert res["primary_trend"] == "BULLISH"
    assert res["alignment_score"] > 0.5
    assert res["mtf_confidence"] > 0.5


@pytest.mark.asyncio
async def test_technical_engine_and_explainer():
    engine = TechnicalAnalysisEngine()
    # Simulated provider fallback is used if yfinance fails/runs in test
    report = await engine.analyze("AAPL", ["1D", "1W"])
    assert "symbol" in report
    assert "timeframe_reports" in report
    assert "1D" in report["timeframe_reports"]
    
    # Check XAI explanation
    explanation = TechnicalExplainer.generate_explanation(report)
    assert explanation["symbol"] == "AAPL"
    assert "primary_signal" in explanation
    assert "technical_reasoning" in explanation
    assert "capital_flow_reasoning" in explanation


@pytest.mark.asyncio
async def test_technical_endpoints(client: AsyncClient):
    # Test GET analysis
    res = await client.get("/api/v1/technical/AAPL?timeframes=1D,1W")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "timeframe_reports" in data["data"]

    # Test GET indicators
    res_ind = await client.get("/api/v1/technical/AAPL/indicators?timeframe=1D")
    assert res_ind.status_code == 200
    data_ind = res_ind.json()
    assert data_ind["success"] is True

    # Test GET market-structure
    res_ms = await client.get("/api/v1/technical/AAPL/market-structure?timeframe=1D")
    assert res_ms.status_code == 200
    data_ms = res_ms.json()
    assert data_ms["success"] is True

    # Test GET patterns
    res_pat = await client.get("/api/v1/technical/AAPL/patterns?timeframe=1D")
    assert res_pat.status_code == 200
    data_pat = res_pat.json()
    assert data_pat["success"] is True

    # Test GET multi-timeframe
    res_mtf = await client.get("/api/v1/technical/AAPL/multi-timeframe")
    assert res_mtf.status_code == 200
    data_mtf = res_mtf.json()
    assert data_mtf["success"] is True

    # Test POST explain
    res_exp = await client.post("/api/v1/technical/AAPL/explain")
    assert res_exp.status_code == 200
    data_exp = res_exp.json()
    assert data_exp["success"] is True
