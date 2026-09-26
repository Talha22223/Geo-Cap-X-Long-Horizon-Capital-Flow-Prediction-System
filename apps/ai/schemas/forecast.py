"""
Pydantic schemas for Multi-Horizon Scenario Forecast REST API (V7.1 Engine).
"""
from __future__ import annotations
from typing import Any
from datetime import datetime
from pydantic import BaseModel, Field


class ForecastGenerateReq(BaseModel):
    event_id: str = Field(..., description="Canonical event ID to forecast")
    horizons: list[str] | None = Field(default=["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"], description="Time horizons to forecast")


class ScenarioOut(BaseModel):
    scenario_id: str | None = None
    type: str = Field(..., description="CONTINUATION, ESCALATION, DE-ESCALATION")
    title: str
    description: str
    assumptions: list[str] = Field(default_factory=list)
    supporting_evidence: list[str] = Field(default_factory=list)
    opposing_evidence: list[str] = Field(default_factory=list)
    affected_sectors_assets: list[str] = Field(default_factory=list)
    relevant_network_paths: list[str] = Field(default_factory=list)
    uncertainty: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    scenario_confidence: float


class AnalogueOut(BaseModel):
    historical_event_title: str
    historical_date: str
    similarity_score: float
    similarity_method: str
    matching_attributes: list[str] = Field(default_factory=list)
    observed_outcome: str
    source: str


class SensitivityOut(BaseModel):
    baseline_confidence: float
    primary_sensitivity_driver: str
    sensitivity_breakdown: list[dict[str, Any]] = Field(default_factory=list)


class MultiHorizonForecastOut(BaseModel):
    id: str
    event_id: str
    horizon: str
    status: str
    confidence_state: str
    overall_confidence: float
    estimated_rotation_usd_bn: float
    affected_country: str | None = None
    affected_region: str | None = None
    affected_sector: str | None = None
    asset_class: str | None = None
    primary_sensitivity_driver: str | None = None
    methodology_version: str = "v7.1"
    data_snapshot: dict[str, Any] | None = None
    sensitivity: SensitivityOut | None = None
    scenarios: list[ScenarioOut] = Field(default_factory=list)
    analogues: list[AnalogueOut] = Field(default_factory=list)
    created_at: datetime | None = None


class MethodologyOut(BaseModel):
    version: str = "v7.1"
    name: str = "Multi-Horizon Scenario Intelligence Engine"
    description: str = "Evidence-backed multi-horizon forecasting synthesizing Event NLP, Graph SNA, Market Abnormality, and Multidimensional Historical Analogue Matching."
    supported_horizons: list[str] = Field(default=["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"])
    supported_scenarios: list[str] = Field(default=["CONTINUATION", "ESCALATION", "DE-ESCALATION"])
    evidence_layers: list[str] = Field(default=["Layer 1: Event Intelligence", "Layer 2: Network Graph Exposure", "Layer 3: Real Market Observation", "Layer 4: Historical Analogue", "Layer 5: Data Quality"])
    zero_randomness_guarantee: bool = True
