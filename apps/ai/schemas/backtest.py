"""
Pydantic schemas for Forecast Validation & Backtesting REST API (V7.2 Engine).
"""
from __future__ import annotations
from typing import Any
from datetime import datetime
from pydantic import BaseModel, Field


class BacktestRunReq(BaseModel):
    horizons: list[str] | None = Field(default=["SHORT_TERM", "MEDIUM_TERM"], description="Horizons to evaluate in backtest")


class ForecastComparisonOut(BaseModel):
    id: str | None = None
    event_title: str
    event_date: str
    category: str
    sector: str | None = None
    region: str | None = None
    cutoff_timestamp: str
    predicted_direction: str
    predicted_confidence: float
    actual_direction: str
    directional_match: bool
    error_classification: str | None = None
    evidence_summary: str | None = None


class CalibrationBucketOut(BaseModel):
    confidence_bucket: str
    prediction_count: int
    observed_accuracy: float
    calibration_gap: float


class ConfusionMatrixOut(BaseModel):
    true_inflows: int
    true_outflows: int
    false_inflows: int
    false_outflows: int
    precision: float
    recall: float


class BaselineComparisonOut(BaseModel):
    geocap_directional_accuracy: float
    naive_persistence_accuracy: float
    sector_average_accuracy: float
    information_gain_delta: float
    sample_size: int
    baselines_evaluated: list[dict[str, Any]] = Field(default_factory=list)
    conclusion: str


class BacktestRunOut(BaseModel):
    id: str
    status: str
    methodology_version: str = "v7.2"
    dataset_version: str = "v7.2_seed_50_events"
    total_events_tested: int
    directional_accuracy: float
    confusion_matrix: ConfusionMatrixOut
    calibration_curve: list[CalibrationBucketOut] = Field(default_factory=list)
    baseline_comparison: BaselineComparisonOut
    leakage_test_status: str
    sample_composition: dict[str, Any]
    error_diagnostics_count: int
    comparisons: list[ForecastComparisonOut] = Field(default_factory=list)
    created_at: datetime | None = None
