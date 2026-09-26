"""
Chart pattern recognition engine.
Detects major classical chart patterns: Double Top/Bottom, Head and Shoulders, Triangles, Channels, and Wedges.
"""
from __future__ import annotations
import math
from technical.market_structure import MarketStructureDetector


class PatternMatch:
    """Represents a matched classical chart pattern."""

    def __init__(
        self,
        found: bool,
        pattern_name: str,
        pattern_type: str,  # BULLISH, BEARISH
        confidence: float,
        points: list[int],  # Indices of pattern key points
        target_price: float,
    ) -> None:
        self.found = found
        self.pattern_name = pattern_name
        self.pattern_type = pattern_type
        self.confidence = confidence
        self.points = points
        self.target_price = target_price

    def to_dict(self) -> dict:
        return {
            "found": self.found,
            "pattern_name": self.pattern_name,
            "pattern_type": self.pattern_type,
            "confidence": round(self.confidence, 2),
            "points": self.points,
            "target_price": round(self.target_price, 2),
        }


class PatternDetector:
    """Detects classical chart patterns from OHLCV and pivots."""

    @staticmethod
    def detect_all(ohlcv: list[dict], window: int = 5) -> list[dict]:
        """Runs all pattern detection routines and returns matches."""
        if len(ohlcv) < 30:
            return []

        highs = [bar["high"] for bar in ohlcv]
        lows = [bar["low"] for bar in ohlcv]
        closes = [bar["close"] for bar in ohlcv]

        pivots = MarketStructureDetector.detect_pivots(highs, lows, window)
        sh = pivots["swing_highs"]
        sl = pivots["swing_lows"]

        matches = []

        # 1. Double Top / Bottom
        dt = PatternDetector._detect_double_top(closes, sh, sl)
        if dt.found:
            matches.append(dt.to_dict())
        db = PatternDetector._detect_double_bottom(closes, sh, sl)
        if db.found:
            matches.append(db.to_dict())

        # 2. Head and Shoulders / Inverse
        hs = PatternDetector._detect_head_and_shoulders(closes, sh, sl)
        if hs.found:
            matches.append(hs.to_dict())
        ihs = PatternDetector._detect_inverse_head_and_shoulders(closes, sh, sl)
        if ihs.found:
            matches.append(ihs.to_dict())

        # 3. Triangles
        tri = PatternDetector._detect_triangles(closes, sh, sl)
        matches.extend([t.to_dict() for t in tri if t.found])

        # 4. Channels
        chan = PatternDetector._detect_channels(closes, sh, sl)
        matches.extend([c.to_dict() for c in chan if c.found])

        # 5. Wedges
        wed = PatternDetector._detect_wedges(closes, sh, sl)
        matches.extend([w.to_dict() for w in wed if w.found])

        return matches

    @staticmethod
    def _detect_double_top(closes: list[float], sh: list[dict], sl: list[dict], tolerance: float = 0.02) -> PatternMatch:
        # Requires at least 2 swing highs and 1 swing low in between
        if len(sh) >= 2 and len(sl) >= 1:
            p1 = sh[-2]
            p2 = sh[-1]
            valley = sl[-1]
            
            # Valley must be between the two peaks
            if p1["index"] < valley["index"] < p2["index"]:
                price_diff = abs(p1["price"] - p2["price"]) / p1["price"]
                if price_diff <= tolerance:
                    # Breakout confirmation: current price is below neckline (valley price)
                    current_price = closes[-1]
                    neckline = valley["price"]
                    
                    if current_price < neckline:
                        target = neckline - (p1["price"] - neckline)
                        return PatternMatch(True, "Double Top", "BEARISH", 0.85, [p1["index"], valley["index"], p2["index"]], target)
                        
        return PatternMatch(False, "Double Top", "BEARISH", 0.0, [], 0.0)

    @staticmethod
    def _detect_double_bottom(closes: list[float], sh: list[dict], sl: list[dict], tolerance: float = 0.02) -> PatternMatch:
        # Requires at least 2 swing lows and 1 swing high in between
        if len(sl) >= 2 and len(sh) >= 1:
            v1 = sl[-2]
            v2 = sl[-1]
            peak = sh[-1]
            
            # Peak must be between the two valleys
            if v1["index"] < peak["index"] < v2["index"]:
                price_diff = abs(v1["price"] - v2["price"]) / v1["price"]
                if price_diff <= tolerance:
                    # Breakout confirmation: current price is above neckline (peak price)
                    current_price = closes[-1]
                    neckline = peak["price"]
                    
                    if current_price > neckline:
                        target = neckline + (neckline - v1["price"])
                        return PatternMatch(True, "Double Bottom", "BULLISH", 0.85, [v1["index"], peak["index"], v2["index"]], target)
                        
        return PatternMatch(False, "Double Bottom", "BULLISH", 0.0, [], 0.0)

    @staticmethod
    def _detect_head_and_shoulders(closes: list[float], sh: list[dict], sl: list[dict], tolerance: float = 0.04) -> PatternMatch:
        # Need 3 peaks: Left Shoulder, Head, Right Shoulder
        if len(sh) >= 3 and len(sl) >= 2:
            s1 = sh[-3]
            head = sh[-2]
            s2 = sh[-1]
            
            v1 = sl[-2]
            v2 = sl[-1]
            
            # Correct order check
            if s1["index"] < v1["index"] < head["index"] < v2["index"] < s2["index"]:
                # Head must be higher than both shoulders
                if head["price"] > s1["price"] and head["price"] > s2["price"]:
                    # Shoulders should be at similar price levels
                    shoulder_diff = abs(s1["price"] - s2["price"]) / s1["price"]
                    if shoulder_diff <= tolerance:
                        current_price = closes[-1]
                        neckline = (v1["price"] + v2["price"]) / 2.0
                        
                        if current_price < neckline:
                            target = neckline - (head["price"] - neckline)
                            return PatternMatch(True, "Head and Shoulders", "BEARISH", 0.90, [s1["index"], head["index"], s2["index"]], target)
                            
        return PatternMatch(False, "Head and Shoulders", "BEARISH", 0.0, [], 0.0)

    @staticmethod
    def _detect_inverse_head_and_shoulders(closes: list[float], sh: list[dict], sl: list[dict], tolerance: float = 0.04) -> PatternMatch:
        # Need 3 troughs: Left Shoulder, Head, Right Shoulder
        if len(sl) >= 3 and len(sh) >= 2:
            s1 = sl[-3]
            head = sl[-2]
            s2 = sl[-1]
            
            p1 = sh[-2]
            p2 = sh[-1]
            
            if s1["index"] < p1["index"] < head["index"] < p2["index"] < s2["index"]:
                # Head must be lower than both shoulders
                if head["price"] < s1["price"] and head["price"] < s2["price"]:
                    shoulder_diff = abs(s1["price"] - s2["price"]) / s1["price"]
                    if shoulder_diff <= tolerance:
                        current_price = closes[-1]
                        neckline = (p1["price"] + p2["price"]) / 2.0
                        
                        if current_price > neckline:
                            target = neckline + (neckline - head["price"])
                            return PatternMatch(True, "Inverse Head and Shoulders", "BULLISH", 0.90, [s1["index"], head["index"], s2["index"]], target)
                            
        return PatternMatch(False, "Inverse Head and Shoulders", "BULLISH", 0.0, [], 0.0)

    @staticmethod
    def _detect_triangles(closes: list[float], sh: list[dict], sl: list[dict]) -> list[PatternMatch]:
        results = []
        if len(sh) < 2 or len(sl) < 2:
            return results

        last_sh = sh[-2:]
        last_sl = sl[-2:]
        
        # Check slopes of swing highs and swing lows
        high_slope = last_sh[1]["price"] - last_sh[0]["price"]
        low_slope = last_sl[1]["price"] - last_sl[0]["price"]
        
        current_price = closes[-1]
        
        # 1. Ascending Triangle (Flat top resistance, rising lows)
        if abs(high_slope) / last_sh[0]["price"] < 0.01 and low_slope > 0.0:
            neckline = last_sh[1]["price"]
            if current_price > neckline:
                target = current_price + (last_sh[1]["price"] - last_sl[0]["price"])
                results.append(PatternMatch(True, "Ascending Triangle", "BULLISH", 0.75, [last_sh[0]["index"], last_sl[0]["index"]], target))
                
        # 2. Descending Triangle (Flat bottom support, falling highs)
        elif abs(low_slope) / last_sl[0]["price"] < 0.01 and high_slope < 0.0:
            neckline = last_sl[1]["price"]
            if current_price < neckline:
                target = current_price - (last_sh[0]["price"] - last_sl[1]["price"])
                results.append(PatternMatch(True, "Descending Triangle", "BEARISH", 0.75, [last_sh[0]["index"], last_sl[0]["index"]], target))
                
        # 3. Symmetrical Triangle (Falling highs, rising lows)
        elif high_slope < 0.0 and low_slope > 0.0:
            if current_price > last_sh[1]["price"]:
                target = current_price + (last_sh[0]["price"] - last_sl[0]["price"])
                results.append(PatternMatch(True, "Symmetrical Triangle", "BULLISH", 0.70, [last_sh[0]["index"], last_sl[0]["index"]], target))
            elif current_price < last_sl[1]["price"]:
                target = current_price - (last_sh[0]["price"] - last_sl[0]["price"])
                results.append(PatternMatch(True, "Symmetrical Triangle", "BEARISH", 0.70, [last_sh[0]["index"], last_sl[0]["index"]], target))
                
        return results

    @staticmethod
    def _detect_channels(closes: list[float], sh: list[dict], sl: list[dict], tolerance: float = 0.015) -> list[PatternMatch]:
        results = []
        if len(sh) < 2 or len(sl) < 2:
            return results

        last_sh = sh[-2:]
        last_sl = sl[-2:]
        
        high_slope = (last_sh[1]["price"] - last_sh[0]["price"]) / (last_sh[1]["index"] - last_sh[0]["index"])
        low_slope = (last_sl[1]["price"] - last_sl[0]["price"]) / (last_sl[1]["index"] - last_sl[0]["index"])
        
        # Parallel lines check (similar slopes)
        if abs(high_slope - low_slope) / max(1e-5, abs(high_slope)) <= 0.25:
            current_price = closes[-1]
            
            # Ascending Channel
            if high_slope > 0.0:
                if current_price > last_sh[1]["price"]:
                    target = current_price + (last_sh[1]["price"] - last_sl[1]["price"])
                    results.append(PatternMatch(True, "Ascending Channel Breakout", "BULLISH", 0.80, [last_sh[0]["index"], last_sl[0]["index"]], target))
                elif current_price < last_sl[1]["price"]:
                    target = current_price - (last_sh[1]["price"] - last_sl[1]["price"])
                    results.append(PatternMatch(True, "Ascending Channel Breakdown", "BEARISH", 0.80, [last_sh[0]["index"], last_sl[0]["index"]], target))
            # Descending Channel
            else:
                if current_price > last_sh[1]["price"]:
                    target = current_price + (last_sh[1]["price"] - last_sl[1]["price"])
                    results.append(PatternMatch(True, "Descending Channel Breakout", "BULLISH", 0.80, [last_sh[0]["index"], last_sl[0]["index"]], target))
                elif current_price < last_sl[1]["price"]:
                    target = current_price - (last_sh[1]["price"] - last_sl[1]["price"])
                    results.append(PatternMatch(True, "Descending Channel Breakdown", "BEARISH", 0.80, [last_sh[0]["index"], last_sl[0]["index"]], target))
                    
        return results

    @staticmethod
    def _detect_wedges(closes: list[float], sh: list[dict], sl: list[dict]) -> list[PatternMatch]:
        results = []
        if len(sh) < 2 or len(sl) < 2:
            return results

        last_sh = sh[-2:]
        last_sl = sl[-2:]
        
        high_slope = last_sh[1]["price"] - last_sh[0]["price"]
        low_slope = last_sl[1]["price"] - last_sl[0]["price"]
        
        current_price = closes[-1]
        
        # 1. Rising Wedge (Both slopes positive, but high slope flatter than low slope - converging upwards)
        if high_slope > 0.0 and low_slope > 0.0 and low_slope > high_slope:
            if current_price < last_sl[1]["price"]:
                target = current_price - (last_sh[0]["price"] - last_sl[0]["price"])
                results.append(PatternMatch(True, "Rising Wedge", "BEARISH", 0.75, [last_sh[0]["index"], last_sl[0]["index"]], target))
                
        # 2. Falling Wedge (Both slopes negative, but high slope steeper than low slope - converging downwards)
        elif high_slope < 0.0 and low_slope < 0.0 and abs(high_slope) > abs(low_slope):
            if current_price > last_sh[1]["price"]:
                target = current_price + (last_sh[0]["price"] - last_sl[0]["price"])
                results.append(PatternMatch(True, "Falling Wedge", "BULLISH", 0.75, [last_sh[0]["index"], last_sl[0]["index"]], target))
                
        return results
