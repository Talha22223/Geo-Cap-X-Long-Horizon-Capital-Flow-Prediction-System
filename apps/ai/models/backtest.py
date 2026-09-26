"""
SQLAlchemy models for Forecast Validation & Backtesting (V7.2 Engine).
Relational persistence for backtest execution runs, point-in-time comparisons, calibration curves, and error analysis.
"""
from __future__ import annotations
import uuid
from typing import Any
from sqlalchemy import String, Text, Float, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base, TimestampMixin


class BacktestRun(Base, TimestampMixin):
    """
    Persistent record of a historical backtesting execution run.
    """
    __tablename__ = "backtest_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # BACKTEST_COMPLETED, INSUFFICIENT_BACKTEST_SAMPLE
    methodology_version: Mapped[str] = mapped_column(String(50), default="v7.2", nullable=False)
    dataset_version: Mapped[str] = mapped_column(String(50), nullable=False)
    
    total_events_tested: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    directional_accuracy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    confusion_matrix_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    calibration_curve_json: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    baseline_comparison_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    sample_composition_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    leakage_test_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Relationships
    comparisons: Mapped[list[ForecastOutcomeComparisonModel]] = relationship(
        "ForecastOutcomeComparisonModel", back_populates="backtest_run", cascade="all, delete-orphan"
    )


class ForecastOutcomeComparisonModel(Base):
    """
    Point-in-time forecast vs empirical outcome comparison item.
    """
    __tablename__ = "forecast_outcome_comparisons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    backtest_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("backtest_runs.id", ondelete="CASCADE"), index=True, nullable=False)
    
    event_title: Mapped[str] = mapped_column(String(500), nullable=False)
    event_date: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    cutoff_timestamp: Mapped[str] = mapped_column(String(100), nullable=False)
    predicted_direction: Mapped[str] = mapped_column(String(50), nullable=False)
    predicted_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    actual_direction: Mapped[str] = mapped_column(String(50), nullable=False)
    directional_match: Mapped[bool] = mapped_column(Boolean, nullable=False)
    
    error_classification: Mapped[str | None] = mapped_column(String(100), nullable=True)
    evidence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    backtest_run: Mapped[BacktestRun] = relationship("BacktestRun", back_populates="comparisons")
