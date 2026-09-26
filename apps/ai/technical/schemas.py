"""
Pydantic schemas for Technical Analysis features.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class TechnicalAnalysisOut(BaseModel):
    id: str
    symbol: str
    timeframe: str
    indicators: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MarketStructureOut(BaseModel):
    id: str
    symbol: str
    timeframe: str
    trend: str
    trend_strength: float
    structure_data: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatternOut(BaseModel):
    id: str
    symbol: str
    timeframe: str
    pattern_name: str
    pattern_type: str
    confidence: float
    details: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MultiTimeframeOut(BaseModel):
    symbol: str
    timeframe_alignment: dict[str, str]  # timeframe -> trend direction
    alignment_score: float  # 0.0 to 1.0 (percentage of timeframes agreeing)
    mtf_confidence: float   # weighted overall confidence
    primary_trend: str      # overall primary trend direction


class TechnicalExplanationOut(BaseModel):
    symbol: str
    primary_signal: str
    confidence: float
    technical_reasoning: str
    indicator_confirmations: list[str]
    capital_flow_reasoning: str
    alternative_scenarios: list[dict[str, Any]]
    risk_factors: list[str]
    historical_context: str | None = None
