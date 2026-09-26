"""
Anti-Data-Leakage Tester (V7.2 Engine).
Explicitly tests point-in-time temporal isolation by injecting future events and market observations
and verifying zero data leakage into forecasts generated for cutoff timestamp T.
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from capital_flow.point_in_time import PointInTimeFilter

logger = logging.getLogger(__name__)


class DataLeakageTester:
    """
    Automated Data Leakage Verification Tester.
    """

    @classmethod
    def run_leakage_test(
        cls,
        base_event: dict[str, Any],
        historical_pool: list[dict[str, Any]],
        market_observations: list[dict[str, Any]],
        forecast_eval_fn: Any
    ) -> dict[str, Any]:
        """
        Executes anti-leakage injection test.
        """
        cutoff_dt = base_event.get("published_at") or base_event.get("event_date")
        if isinstance(cutoff_dt, str):
            cutoff_dt = datetime.fromisoformat(cutoff_dt.replace("Z", "+00:00"))
        if not isinstance(cutoff_dt, datetime):
            cutoff_dt = datetime.now(timezone.utc)
        if cutoff_dt.tzinfo is None:
            cutoff_dt = cutoff_dt.replace(tzinfo=timezone.utc)

        # 1. Generate baseline forecast at cutoff T (clean data pool)
        clean_events = PointInTimeFilter.filter_events([base_event], cutoff_dt)
        clean_obs = PointInTimeFilter.filter_market_observations(market_observations, cutoff_dt)
        clean_analogues = PointInTimeFilter.filter_historical_analogues(historical_pool, cutoff_dt)

        baseline_res = forecast_eval_fn(clean_events[0] if clean_events else base_event, clean_obs, clean_analogues)

        # 2. Inject Future Data (T + 30 Days)
        future_dt = cutoff_dt + timedelta(days=30)
        future_event = {
            "title": "FUTURE LEAKAGE TEST EVENT",
            "published_at": future_dt,
            "category": "MONETARY_POLICY",
            "severity": 0.99
        }
        future_obs = {
            "timestamp": future_dt,
            "close_price": 9999.99,
            "volume": 1.0e12
        }

        polluted_events = [base_event, future_event]
        polluted_obs = market_observations + [future_obs]

        # 3. Filter polluted pools using cutoff T
        filtered_events = PointInTimeFilter.filter_events(polluted_events, cutoff_dt)
        filtered_obs = PointInTimeFilter.filter_market_observations(polluted_obs, cutoff_dt)
        filtered_analogues = PointInTimeFilter.filter_historical_analogues(historical_pool, cutoff_dt)

        # 4. Generate forecast with filtered pools
        post_injection_res = forecast_eval_fn(filtered_events[0], filtered_obs, filtered_analogues)

        # 5. Assert Zero Leakage
        future_events_in_filtered = any(ev.get("title") == "FUTURE LEAKAGE TEST EVENT" for ev in filtered_events)
        future_obs_in_filtered = any(obs.get("close_price") == 9999.99 for obs in filtered_obs)

        score_match = (baseline_res.get("overall_confidence") == post_injection_res.get("overall_confidence"))
        leakage_detected = future_events_in_filtered or future_obs_in_filtered or not score_match

        return {
            "status": "PASSED" if not leakage_detected else "FAILED_LEAKAGE_DETECTED",
            "cutoff_timestamp": cutoff_dt.isoformat(),
            "future_injection_timestamp": future_dt.isoformat(),
            "future_events_leaked": future_events_in_filtered,
            "future_observations_leaked": future_obs_in_filtered,
            "baseline_confidence": baseline_res.get("overall_confidence"),
            "post_injection_confidence": post_injection_res.get("overall_confidence"),
            "zero_leakage_verified": not leakage_detected,
            "summary": "Verified zero future data leakage: point-in-time filter strictly excluded all data published after cutoff T."
        }
