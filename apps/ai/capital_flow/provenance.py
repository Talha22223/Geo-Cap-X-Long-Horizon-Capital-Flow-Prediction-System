"""
Provenance & Data Freshness Engine (V8.1 Engine).
Captures standardized data lineage, source metadata, domain-appropriate freshness tracking,
and 10-stage end-to-end traceability chains.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class SourceProvenance:
    """
    Standardized provenance metadata for an intelligence record.
    """
    provider: str
    external_id: str | None = None
    source_url: str | None = None
    published_at: datetime | str | None = None
    ingestion_timestamp: datetime | str | None = None
    processing_timestamp: datetime | str | None = None
    data_origin: str = "PIPELINE"
    methodology_version: str = "v8.1"
    data_quality_score: float = 1.0
    status: str = "VERIFIED"


@dataclass
class TraceabilityChainItem:
    """
    Single stage in the 10-stage intelligence pipeline trace.
    """
    stage_index: int
    stage_name: str
    record_id: str
    timestamp: str
    status: str
    summary: str
    metadata: dict[str, Any] = field(default_factory=dict)


class DataFreshnessTracker:
    """
    Evaluates data freshness based on domain-appropriate thresholds.
    Market Observations: 24h threshold (Stale >= 48h)
    News Events: 6h threshold (Stale >= 12h)
    Macro Economic Data: 30d threshold (Stale >= 60d)
    Graph SNA Analysis: 12h threshold (Stale >= 24h)
    """

    FRESHNESS_THRESHOLDS_HOURS = {
        "MARKET_OBSERVATION": {"fresh": 24.0, "stale": 48.0},
        "NEWS_EVENT": {"fresh": 6.0, "stale": 12.0},
        "MACRO_ECONOMIC": {"fresh": 720.0, "stale": 1440.0},
        "GRAPH_SNA": {"fresh": 12.0, "stale": 24.0},
        "FORECAST_SCENARIO": {"fresh": 12.0, "stale": 24.0},
    }

    @classmethod
    def evaluate_freshness(
        cls,
        data_type: str,
        timestamp: datetime | str | None,
        now_dt: datetime | None = None
    ) -> dict[str, Any]:
        """
        Calculates freshness age and status (FRESH, AGING, STALE, UNAVAILABLE).
        """
        if timestamp is None:
            return {
                "freshness_status": "UNAVAILABLE",
                "freshness_age_hours": None,
                "threshold_hours": cls.FRESHNESS_THRESHOLDS_HOURS.get(data_type, {}).get("fresh", 24.0),
                "is_usable": False,
                "summary": f"Timestamp missing for {data_type}; data marked UNAVAILABLE."
            }

        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError:
                return {
                    "freshness_status": "UNAVAILABLE",
                    "freshness_age_hours": None,
                    "threshold_hours": 24.0,
                    "is_usable": False,
                    "summary": f"Invalid timestamp format '{timestamp}'."
                }

        if now_dt is None:
            now_dt = datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        if now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        age_seconds = max(0.0, (now_dt - timestamp).total_seconds())
        age_hours = round(age_seconds / 3600.0, 2)

        cfg = cls.FRESHNESS_THRESHOLDS_HOURS.get(data_type.upper(), {"fresh": 24.0, "stale": 48.0})
        fresh_thresh = cfg["fresh"]
        stale_thresh = cfg["stale"]

        if age_hours <= fresh_thresh:
            status = "FRESH"
        elif age_hours < stale_thresh:
            status = "AGING"
        else:
            status = "STALE"

        return {
            "freshness_status": status,
            "freshness_age_hours": age_hours,
            "threshold_hours": fresh_thresh,
            "stale_threshold_hours": stale_thresh,
            "is_usable": status in ["FRESH", "AGING"],
            "summary": f"Data age is {age_hours:.1f}h (Threshold: {fresh_thresh:.0f}h). Status: {status}."
        }
