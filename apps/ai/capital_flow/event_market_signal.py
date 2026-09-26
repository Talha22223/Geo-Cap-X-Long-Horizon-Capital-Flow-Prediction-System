"""
Event-Related Market Signal Engine.
Generates EVENT_ALIGNED_MARKET_SIGNAL and EVENT_RELATED_MARKET_ANOMALY objects
combining statistical abnormalities, window metrics, data quality, and provenance.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from models.event import ExtractedEvent

logger = logging.getLogger(__name__)


class EventMarketSignalEngine:
    """
    Generates derived event-aligned market signals.
    Does NOT assert unsupported causal claims.
    """

    @staticmethod
    def generate_signal(
        event: ExtractedEvent,
        instrument_symbol: str,
        window_result: dict,
        observations: list[dict]
    ) -> dict:
        """
        Produce a structured Event-Aligned Market Signal payload.
        """
        status = window_result.get("status")
        z_score = window_result.get("abnormality_z_score")

        if status == "INSUFFICIENT_HISTORY" or z_score is None:
            return {
                "event_id": event.id,
                "event_title": event.title,
                "instrument_symbol": instrument_symbol,
                "signal_type": "INSUFFICIENT_DATA_SIGNAL",
                "abnormality_z_score": None,
                "data_quality_score": 0.5,
                "signal_strength": 0.0,
                "event_confidence": event.overall_confidence,
                "supporting_sources": ["YAHOO_FINANCE"],
                "disclaimer": "Insufficient historical observations available to establish baseline.",
            }

        abs_z = abs(z_score)
        signal_strength = min(1.0, round(abs_z / 3.0, 4))

        signal_type = "EVENT_ALIGNED_MARKET_SIGNAL"
        if abs_z >= 2.0:
            signal_type = "EVENT_RELATED_MARKET_ANOMALY"

        data_quality = 1.0 if len(observations) >= 30 else 0.8

        return {
            "event_id": event.id,
            "event_title": event.title,
            "instrument_symbol": instrument_symbol,
            "signal_type": signal_type,
            "event_timestamp": event.created_at.isoformat() if hasattr(event.created_at, "isoformat") else str(event.created_at),
            "observation_window": "[-30_DAYS, +5_DAYS]",
            "baseline_mean": window_result.get("pre_event_baseline_mean"),
            "baseline_std": window_result.get("pre_event_baseline_std"),
            "event_day_value": window_result.get("event_day_value"),
            "post_event_value": window_result.get("post_event_value"),
            "abnormality_z_score": z_score,
            "data_quality_score": data_quality,
            "signal_strength": signal_strength,
            "event_confidence": event.overall_confidence,
            "supporting_sources": ["YAHOO_FINANCE"],
            "disclaimer": (
                "EVENT_ALIGNED_MARKET_SIGNAL measures temporal correlation and statistical anomaly "
                "surrounding the event. It does NOT assert a proven causal relationship."
            )
        }
