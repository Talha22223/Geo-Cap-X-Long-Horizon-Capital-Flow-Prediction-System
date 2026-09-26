"""
Event Window Analysis Engine.
Analyzes market observations in configurable time windows around canonical event dates.
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from capital_flow.abnormality import StatisticalAbnormalityDetector

logger = logging.getLogger(__name__)


class EventWindowAnalyzer:
    """
    Analyzes observable market data around event timestamps.
    """

    @staticmethod
    def analyze_window(
        event_timestamp: datetime,
        observations: list[dict],
        pre_event_days: int = 30,
        post_event_days: int = 5
    ) -> dict:
        """
        Partition observations into pre-event baseline, event day, and post-event reaction.
        Calculates baseline mean, std dev, and event abnormality.
        """
        if event_timestamp.tzinfo is None:
            event_timestamp = event_timestamp.replace(tzinfo=timezone.utc)

        sorted_obs = sorted(observations, key=lambda x: x["timestamp"])

        pre_cutoff = event_timestamp - timedelta(days=pre_event_days)
        post_cutoff = event_timestamp + timedelta(days=post_event_days)

        pre_event_obs = [o for o in sorted_obs if pre_cutoff <= o["timestamp"] < event_timestamp]
        event_obs = [o for o in sorted_obs if abs((o["timestamp"] - event_timestamp).total_seconds()) <= 86400]
        post_event_obs = [o for o in sorted_obs if event_timestamp < o["timestamp"] <= post_cutoff]

        pre_closes = [o["close_price"] for o in pre_event_obs if o.get("close_price") is not None]

        if len(pre_closes) < 10:
            return {
                "status": "INSUFFICIENT_HISTORY",
                "pre_event_count": len(pre_closes),
                "event_day_value": event_obs[0]["close_price"] if event_obs and event_obs[0].get("close_price") else None,
                "post_event_value": post_event_obs[-1]["close_price"] if post_event_obs and post_event_obs[-1].get("close_price") else None,
                "abnormality": None
            }

        event_val = event_obs[0]["close_price"] if event_obs and event_obs[0].get("close_price") else pre_closes[-1]
        abnormality = StatisticalAbnormalityDetector.calculate_z_score(event_val, pre_closes)

        post_val = post_event_obs[-1]["close_price"] if post_event_obs and post_event_obs[-1].get("close_price") else event_val

        return {
            "status": "CALCULATED",
            "pre_event_count": len(pre_closes),
            "pre_event_baseline_mean": abnormality["baseline_mean"],
            "pre_event_baseline_std": abnormality["baseline_std"],
            "event_day_value": event_val,
            "post_event_value": post_val,
            "abnormality_z_score": abnormality["z_score"],
            "percentile": abnormality["percentile"]
        }
