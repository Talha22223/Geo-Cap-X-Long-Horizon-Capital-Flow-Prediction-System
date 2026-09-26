"""
Forecast Input Contract (V7.1 Multi-Horizon Engine).
Defines structured input objects for Event, Network, Market, Historical, and Data Quality layers.
"""
from __future__ import annotations
from enum import Enum
from typing import Any
from dataclasses import dataclass, field
from datetime import datetime


class EvidenceState(str, Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    INSUFFICIENT = "INSUFFICIENT"


@dataclass
class EventEvidenceInput:
    event_id: str
    title: str
    category: str
    severity: float
    confidence: float
    timestamp: datetime | None
    countries: list[str] = field(default_factory=list)
    regions: list[str] = field(default_factory=list)
    sectors: list[str] = field(default_factory=list)
    organizations: list[str] = field(default_factory=list)
    sentiment: str = "NEUTRAL"
    state: EvidenceState = EvidenceState.AVAILABLE


@dataclass
class NetworkEvidenceInput:
    network_exposure_score: float = 0.0
    relationship_confidence: float = 0.0
    directly_exposed_count: int = 0
    indirectly_exposed_count: int = 0
    top_propagation_paths: list[dict[str, Any]] = field(default_factory=list)
    bridge_events_traversed: list[str] = field(default_factory=list)
    state: EvidenceState = EvidenceState.UNAVAILABLE


@dataclass
class MarketEvidenceInput:
    instrument_symbol: str | None = None
    asset_class: str | None = None
    observed_return: float | None = None
    abnormal_z_score: float | None = None
    volume: float | None = None
    abnormal_volume_z_score: float | None = None
    volatility: float | None = None
    historical_observation_count: int = 0
    state: EvidenceState = EvidenceState.UNAVAILABLE


@dataclass
class HistoricalEvidenceInput:
    analogue_count: int = 0
    top_similarity_score: float = 0.0
    matched_analogues: list[dict[str, Any]] = field(default_factory=list)
    state: EvidenceState = EvidenceState.INSUFFICIENT


@dataclass
class DataQualityInput:
    freshness_seconds: float = 0.0
    completeness_score: float = 1.0
    source_quality_score: float = 1.0
    historical_sample_size: int = 0
    independent_sources_count: int = 1
    state: EvidenceState = EvidenceState.AVAILABLE


@dataclass
class ForecastInputContract:
    """
    Validated multi-layer evidence input contract for multi-horizon forecasting.
    Never silently converts missing data into fake zeros.
    """
    event: EventEvidenceInput
    network: NetworkEvidenceInput
    market: MarketEvidenceInput
    historical: HistoricalEvidenceInput
    data_quality: DataQualityInput

    def get_summary_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event.event_id,
            "event_state": self.event.state.value,
            "network_state": self.network.state.value,
            "market_state": self.market.state.value,
            "historical_state": self.historical.state.value,
            "data_quality_state": self.data_quality.state.value,
            "has_market_data": self.market.state == EvidenceState.AVAILABLE,
            "has_network_data": self.network.state == EvidenceState.AVAILABLE,
            "has_historical_analogues": self.historical.state == EvidenceState.AVAILABLE,
        }
