"""
Market structure detection engine.
Identifies support/resistance levels, pivot points (HH/HL/LH/LL), breakouts, and trend strength.
"""
from __future__ import annotations
import math


class MarketStructureDetector:
    """Detects structural price action patterns from historical OHLCV data."""

    @staticmethod
    def detect_pivots(highs: list[float], lows: list[float], window: int = 5) -> dict[str, list[dict]]:
        """
        Detects swing highs and swing lows.
        A swing high is the highest high in a +/- window.
        """
        swing_highs = []
        swing_lows = []
        
        n = len(highs)
        for i in range(window, n - window):
            h_val = highs[i]
            l_val = lows[i]
            
            # Check if swing high
            is_high = True
            for j in range(i - window, i + window + 1):
                if highs[j] > h_val:
                    is_high = False
                    break
            if is_high:
                swing_highs.append({"index": i, "price": h_val})
                
            # Check if swing low
            is_low = True
            for j in range(i - window, i + window + 1):
                if lows[j] < l_val:
                    is_low = False
                    break
            if is_low:
                swing_lows.append({"index": i, "price": l_val})
                
        return {"swing_highs": swing_highs, "swing_lows": swing_lows}

    @staticmethod
    def classify_trend_and_structure(highs: list[float], lows: list[float], window: int = 5) -> dict[str, any]:
        """
        Classifies current swing structure into Higher Highs (HH), Higher Lows (HL),
        Lower Highs (LH), and Lower Lows (LL) and determines current trend.
        """
        pivots = MarketStructureDetector.detect_pivots(highs, lows, window)
        sh = pivots["swing_highs"]
        sl = pivots["swing_lows"]

        # Classification of pivots
        sh_labels = []
        sl_labels = []

        # Classify swing highs
        for idx, h in enumerate(sh):
            if idx == 0:
                sh_labels.append({"index": h["index"], "price": h["price"], "type": "H"})
            else:
                prev_price = sh[idx - 1]["price"]
                label = "HH" if h["price"] > prev_price else "LH"
                sh_labels.append({"index": h["index"], "price": h["price"], "type": label})

        # Classify swing lows
        for idx, l in enumerate(sl):
            if idx == 0:
                sl_labels.append({"index": l["index"], "price": l["price"], "type": "L"})
            else:
                prev_price = sl[idx - 1]["price"]
                label = "HL" if l["price"] > prev_price else "LL"
                sl_labels.append({"index": l["index"], "price": l["price"], "type": label})

        # Determine overall trend based on last few pivots
        trend = "NEUTRAL"
        if len(sh_labels) >= 2 and len(sl_labels) >= 2:
            last_sh = sh_labels[-1]["type"]
            last_sl = sl_labels[-1]["type"]
            
            if last_sh == "HH" and last_sl == "HL":
                trend = "BULLISH"
            elif last_sh == "LH" and last_sl == "LL":
                trend = "BEARISH"
            elif last_sh == "HH" and last_sl == "LL":
                trend = "VOLATILE"
            elif last_sh == "LH" and last_sl == "HL":
                trend = "CONSOLIDATING"

        return {
            "trend": trend,
            "swing_highs": sh_labels,
            "swing_lows": sl_labels,
        }

    @staticmethod
    def detect_support_resistance(highs: list[float], lows: list[float], window: int = 5, tolerance_pct: float = 0.015) -> list[float]:
        """
        Clusters pivot points to find dense horizontal Support and Resistance levels.
        """
        pivots = MarketStructureDetector.detect_pivots(highs, lows, window)
        prices = [p["price"] for p in pivots["swing_highs"] + pivots["swing_lows"]]
        if not prices:
            return []

        # Simple clustering: group levels within tolerance_pct of each other
        clusters = []
        sorted_prices = sorted(prices)
        
        while sorted_prices:
            base = sorted_prices.pop(0)
            cluster = [base]
            # Find elements in range
            to_remove = []
            for p in sorted_prices:
                if (p - base) / base <= tolerance_pct:
                    cluster.append(p)
                    to_remove.append(p)
            for r in to_remove:
                sorted_prices.remove(r)
            clusters.append(sum(cluster) / len(cluster))

        # Sort and return rounded levels
        return [round(c, 2) for c in sorted(clusters)]

    @staticmethod
    def detect_breakouts(closes: list[float], volumes: list[float], sr_levels: list[float], lookback: int = 20) -> list[dict]:
        """
        Detects if current price has broken out above resistance or broken down below support,
        optionally confirmed by volume.
        """
        if len(closes) < 2 or not sr_levels:
            return []

        current_close = closes[-1]
        prev_close = closes[-2]
        avg_vol = sum(volumes[-lookback:]) / len(volumes[-lookback:]) if volumes else 1.0
        current_vol = volumes[-1] if volumes else 1.0
        
        volume_confirmed = current_vol > (avg_vol * 1.5)
        
        signals = []
        for level in sr_levels:
            # Breakout above resistance
            if prev_close <= level and current_close > level:
                signals.append({
                    "type": "BREAKOUT",
                    "level": level,
                    "price": current_close,
                    "volume_confirmed": volume_confirmed,
                    "volume_ratio": round(current_vol / avg_vol, 2) if avg_vol > 0 else 1.0
                })
            # Breakdown below support
            elif prev_close >= level and current_close < level:
                signals.append({
                    "type": "BREAKDOWN",
                    "level": level,
                    "price": current_close,
                    "volume_confirmed": volume_confirmed,
                    "volume_ratio": round(current_vol / avg_vol, 2) if avg_vol > 0 else 1.0
                })
                
        return signals

    @staticmethod
    def calculate_trend_strength(adx_values: list[float | None]) -> float:
        """
        Calculates trend strength based on recent ADX values.
        Returns a score between 0.0 (no trend) and 100.0 (extremely strong trend).
        """
        valid_adx = [v for v in adx_values if v is not None]
        if not valid_adx:
            return 0.0
        recent_adx = valid_adx[-5:]
        avg_adx = sum(recent_adx) / len(recent_adx)
        # ADX:
        # < 20: Weak or no trend
        # 20-25: Developing trend
        # 25-50: Strong trend
        # > 50: Very strong trend
        return round(avg_adx, 2)
