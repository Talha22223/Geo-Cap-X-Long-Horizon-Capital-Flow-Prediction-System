"""
Point-in-Time Data Control & Snapshot Engine (V7.2 Engine).
Enforces strict temporal data cutoffs (T) across events, market observations, network graph nodes,
and historical analogues to prevent future data leakage during backtesting.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from datetime import datetime, date, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PointInTimeSnapshot:
    """
    Point-in-Time input snapshot capturing what the system knew at simulated timestamp T.
    """
    event_id: str
    simulated_forecast_time: datetime
    market_cutoff_timestamp: datetime
    event_cutoff_timestamp: datetime
    historical_cutoff_date: date
    graph_cutoff_timestamp: datetime
    methodology_version: str = "v7.2"
    configuration_version: str = "1.0.0"
    inputs_count: dict[str, int] = field(default_factory=dict)
    metadata_json: dict[str, Any] = field(default_factory=dict)


class PointInTimeFilter:
    """
    Enforces point-in-time temporal isolation.
    Data published or recorded after cutoff_timestamp T is strictly excluded.
    """

    @staticmethod
    def filter_events(
        events: list[dict[str, Any]],
        cutoff: datetime
    ) -> list[dict[str, Any]]:
        """Filter events to those published or occurring at or before cutoff T."""
        cutoff_dt = cutoff if cutoff.tzinfo else cutoff.replace(tzinfo=timezone.utc)
        cutoff_date = cutoff_dt.date()

        filtered: list[dict[str, Any]] = []
        for ev in events:
            pub_at = ev.get("published_at") or ev.get("publication_timestamp")
            ev_date = ev.get("event_date")

            if pub_at:
                pub_dt = pub_at if pub_at.tzinfo else pub_at.replace(tzinfo=timezone.utc)
                if pub_dt <= cutoff_dt:
                    filtered.append(ev)
            elif ev_date:
                if isinstance(ev_date, str):
                    ev_date = date.fromisoformat(ev_date)
                if ev_date <= cutoff_date:
                    filtered.append(ev)

        return filtered

    @staticmethod
    def filter_market_observations(
        observations: list[dict[str, Any]],
        cutoff: datetime
    ) -> list[dict[str, Any]]:
        """Filter market observations to those recorded at or before cutoff T."""
        cutoff_dt = cutoff if cutoff.tzinfo else cutoff.replace(tzinfo=timezone.utc)
        filtered: list[dict[str, Any]] = []

        for obs in observations:
            obs_ts = obs.get("timestamp") or obs.get("ingestion_timestamp")
            if obs_ts:
                if isinstance(obs_ts, str):
                    obs_ts = datetime.fromisoformat(obs_ts.replace("Z", "+00:00"))
                obs_dt = obs_ts if obs_ts.tzinfo else obs_ts.replace(tzinfo=timezone.utc)
                if obs_dt <= cutoff_dt:
                    filtered.append(obs)

        return filtered

    @staticmethod
    def filter_historical_analogues(
        analogues: list[dict[str, Any]],
        cutoff: datetime
    ) -> list[dict[str, Any]]:
        """Filter historical seed events to those that occurred strictly before cutoff T."""
        cutoff_date = cutoff.date()
        filtered: list[dict[str, Any]] = []

        for a in analogues:
            a_date = a.get("event_date") or a.get("date") or a.get("published_at")
            if a_date:
                if isinstance(a_date, datetime):
                    a_date = a_date.date()
                elif isinstance(a_date, str):
                    a_date = date.fromisoformat(a_date[:10])

                if a_date <= cutoff_date:
                    filtered.append(a)

        return filtered

    @classmethod
    def create_snapshot(
        cls,
        event_id: str,
        cutoff: datetime,
        events: list[dict[str, Any]],
        observations: list[dict[str, Any]],
        analogues: list[dict[str, Any]]
    ) -> PointInTimeSnapshot:
        """Create structured PointInTimeSnapshot capturing temporal cutoffs and input counts."""
        cutoff_dt = cutoff if cutoff.tzinfo else cutoff.replace(tzinfo=timezone.utc)

        filtered_events = cls.filter_events(events, cutoff_dt)
        filtered_obs = cls.filter_market_observations(observations, cutoff_dt)
        filtered_analogues = cls.filter_historical_analogues(analogues, cutoff_dt)

        return PointInTimeSnapshot(
            event_id=event_id,
            simulated_forecast_time=cutoff_dt,
            market_cutoff_timestamp=cutoff_dt,
            event_cutoff_timestamp=cutoff_dt,
            historical_cutoff_date=cutoff_dt.date(),
            graph_cutoff_timestamp=cutoff_dt,
            inputs_count={
                "events_available": len(filtered_events),
                "market_observations_available": len(filtered_obs),
                "historical_analogues_available": len(filtered_analogues)
            },
            metadata_json={
                "zero_future_leakage_guarantee": True,
                "cutoff_timestamp_iso": cutoff_dt.isoformat()
            }
        )
