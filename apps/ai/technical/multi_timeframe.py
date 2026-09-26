"""
Multi-timeframe validation and alignment engine.
"""
from __future__ import annotations


class MultiTimeframeAnalyzer:
    """Combines and aligns technical analysis trends across different timeframes."""

    TIMEFRAME_WEIGHTS = {
        "1H": 0.05,
        "4H": 0.10,
        "1D": 0.25,
        "1W": 0.25,
        "1M": 0.20,
        "6M": 0.10,
        "1Y": 0.05,
    }

    @staticmethod
    def analyze_alignment(tf_trends: dict[str, str]) -> dict[str, any]:
        """
        Calculates alignment score, primary trend, and confidence score.
        `tf_trends` maps timeframe (e.g. "1D") to trend direction ("BULLISH", "BEARISH", "NEUTRAL").
        """
        if not tf_trends:
            return {
                "timeframe_alignment": {},
                "alignment_score": 0.0,
                "mtf_confidence": 0.0,
                "primary_trend": "NEUTRAL"
            }

        # Calculate frequency of each trend
        trend_counts = {}
        for trend in tf_trends.values():
            trend_counts[trend] = trend_counts.get(trend, 0) + 1

        # Primary trend is the most frequent trend
        primary_trend = "NEUTRAL"
        max_count = 0
        for trend, count in trend_counts.items():
            if count > max_count and trend != "NEUTRAL":
                primary_trend = trend
                max_count = count

        if primary_trend == "NEUTRAL":
            primary_trend = "NEUTRAL"

        # Alignment score: percentage of timeframes that match the primary trend
        total_timeframes = len(tf_trends)
        matching_count = trend_counts.get(primary_trend, 0)
        alignment_score = matching_count / total_timeframes if total_timeframes > 0 else 0.0

        # Weighted confidence score based on timeframe hierarchy
        weighted_score = 0.0
        total_weight = 0.0
        for tf, trend in tf_trends.items():
            weight = MultiTimeframeAnalyzer.TIMEFRAME_WEIGHTS.get(tf.upper(), 0.1)
            total_weight += weight
            if trend == primary_trend:
                weighted_score += weight
            elif trend == "NEUTRAL":
                weighted_score += weight * 0.5  # Neutral gives half confidence instead of 0

        mtf_confidence = weighted_score / total_weight if total_weight > 0 else 0.0

        return {
            "timeframe_alignment": tf_trends,
            "alignment_score": round(alignment_score, 2),
            "mtf_confidence": round(mtf_confidence, 2),
            "primary_trend": primary_trend
        }
