"""
Pydantic schemas for Capital Flow Predictions and Scenarios.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class EvidenceOut(BaseModel):
    id: str
    prediction_id: str
    event_id: str
    weight: float
    impact_direction: str
    event_title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ScenarioOut(BaseModel):
    id: str
    prediction_id: str
    label: str
    description: str
    probability: float

    model_config = ConfigDict(from_attributes=True)


class ConfidenceScores(BaseModel):
    extraction_confidence: float
    classification_confidence: float
    prediction_confidence: float
    overall_confidence: float


class PredictionOut(BaseModel):
    id: str
    affected_country: str | None = None
    affected_region: str | None = None
    affected_sector: str | None = None
    affected_industry: str | None = None
    currency: str | None = None
    asset_class: str | None = None
    direction: str
    estimated_rotation_usd_bn: float
    time_horizon: str
    
    confidence: ConfidenceScores
    risk_level: str
    reasoning: str
    historical_similarity: list[dict] | None = None
    
    evidence: list[EvidenceOut] = Field(default_factory=list)
    alternative_scenarios: list[ScenarioOut] = Field(default_factory=list)
    
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PredictReq(BaseModel):
    horizon: str = "SIX_MONTHS"  # SIX_MONTHS, ONE_YEAR, THREE_YEARS, FIVE_YEARS
    target_country: str | None = None
    target_sector: str | None = None


class ExplanationReq(BaseModel):
    prediction_id: str
