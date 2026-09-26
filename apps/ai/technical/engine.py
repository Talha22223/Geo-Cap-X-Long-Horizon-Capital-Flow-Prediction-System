"""
Technical Analysis orchestrator engine.
Runs the entire indicator, market structure, pattern, and multi-timeframe pipeline.
"""
from __future__ import annotations
import logging
from technical.market_data import YahooFinanceMarketDataProvider, MarketDataCache
from technical.indicators import TechnicalIndicators
from technical.market_structure import MarketStructureDetector
from technical.patterns import PatternDetector
from technical.multi_timeframe import MultiTimeframeAnalyzer

logger = logging.getLogger(__name__)


class TechnicalAnalysisEngine:
    """Orchestrates the execution of the full technical analysis pipeline."""

    def __init__(self) -> None:
        self.data_provider = YahooFinanceMarketDataProvider()
        self.cache = MarketDataCache()

    async def analyze(self, symbol: str, timeframes: list[str] | None = None) -> dict[str, any]:
        """
        Runs full technical analysis across multiple timeframes.
        """
        if timeframes is None:
            timeframes = ["1H", "4H", "1D", "1W", "1M", "6M", "1Y"]

        logger.info(f"TA Engine: Starting analysis for {symbol} on timeframes {timeframes}...")

        # 1. Fetch data and compute indicators per timeframe
        tf_reports = {}
        tf_trends = {}
        
        for tf in timeframes:
            # Check cache first
            ohlcv = self.cache.get(symbol, tf, 200)
            if not ohlcv:
                ohlcv = await self.data_provider.get_ohlcv(symbol, tf, 200)
                self.cache.set(symbol, tf, 200, ohlcv)

            if not ohlcv:
                logger.warning(f"No OHLCV data fetched for {symbol} on timeframe {tf}")
                continue

            # Run indicators
            indicators_data = TechnicalIndicators.compute_all(ohlcv)
            
            # Run market structure
            highs = [bar["high"] for bar in ohlcv]
            lows = [bar["low"] for bar in ohlcv]
            closes = [bar["close"] for bar in ohlcv]
            volumes = [bar["volume"] for bar in ohlcv]
            
            structure = MarketStructureDetector.classify_trend_and_structure(highs, lows)
            sr_levels = MarketStructureDetector.detect_support_resistance(highs, lows)
            breakouts = MarketStructureDetector.detect_breakouts(closes, volumes, sr_levels)
            
            # ADX values for trend strength
            adx_vals = indicators_data.get("adx", {}).get("adx", [])
            trend_strength = MarketStructureDetector.calculate_trend_strength(adx_vals)

            # Run pattern detection
            patterns = PatternDetector.detect_all(ohlcv)

            # Combine timeframe report
            ohlcv_serializable = [
                {
                    "timestamp": bar["timestamp"].isoformat() if hasattr(bar["timestamp"], "isoformat") else str(bar["timestamp"]),
                    "open": bar["open"],
                    "high": bar["high"],
                    "low": bar["low"],
                    "close": bar["close"],
                    "volume": bar["volume"]
                }
                for bar in ohlcv
            ]

            tf_reports[tf] = {
                "timeframe": tf,
                "last_price": indicators_data.get("last_price", 0.0),
                "last_volume": indicators_data.get("last_volume", 0.0),
                "ohlcv": ohlcv_serializable,
                "indicators": indicators_data,
                "market_structure": {
                    "trend": structure["trend"],
                    "trend_strength": trend_strength,
                    "support_resistance_levels": sr_levels,
                    "swing_highs": structure["swing_highs"],
                    "swing_lows": structure["swing_lows"],
                    "breakouts": breakouts,
                },
                "detected_patterns": patterns
            }
            
            tf_trends[tf] = structure["trend"]

        # 2. Multi-Timeframe Alignment
        mtf_data = MultiTimeframeAnalyzer.analyze_alignment(tf_trends)

        # 3. Form final package
        report = {
            "symbol": symbol.upper(),
            "timestamp": datetime.now().isoformat(),
            "timeframe_reports": tf_reports,
            "multi_timeframe_alignment": mtf_data
        }

        return report

# Simple import helper
from datetime import datetime
