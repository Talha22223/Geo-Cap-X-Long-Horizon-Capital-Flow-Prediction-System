"""
SQLAlchemy models for Multi-Horizon Scenario Forecasts (V7.1 Engine).
Relational persistence for forecasts, scenarios, supporting/opposing evidence, analogues, and sensitivity metrics.
"""
from __future__ import annotations
import uuid
from typing import Any
from sqlalchemy import String, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base, TimestampMixin


class MultiHorizonForecast(Base, TimestampMixin):
    """
    Persistent multi-horizon scenario forecast record.
    """
    __tablename__ = "multi_horizon_forecasts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("extracted_events.id", ondelete="CASCADE"), index=True, nullable=False)
    
    horizon: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # SHORT_TERM, MEDIUM_TERM, LONG_TERM
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # SUFFICIENT_EVIDENCE, INSUFFICIENT_EVIDENCE
    confidence_state: Mapped[str] = mapped_column(String(50), nullable=False)  # ALIGNED_HIGH_CONFIDENCE, MIXED_EVIDENCE, etc.
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    estimated_rotation_usd_bn: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    affected_country: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    affected_region: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    affected_sector: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    asset_class: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    
    primary_sensitivity_driver: Mapped[str | None] = mapped_column(String(100), nullable=True)
    methodology_version: Mapped[str] = mapped_column(String(50), default="v7.1", nullable=False)
    
    data_snapshot_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    sensitivity_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Relationships
    scenarios: Mapped[list[ForecastScenarioModel]] = relationship(
        "ForecastScenarioModel", back_populates="forecast", cascade="all, delete-orphan"
    )
    analogues: Mapped[list[ForecastAnalogueModel]] = relationship(
        "ForecastAnalogueModel", back_populates="forecast", cascade="all, delete-orphan"
    )


class ForecastScenarioModel(Base):
    """
    Evidence-backed scenario item (Continuation, Escalation, Normalization).
    """
    __tablename__ = "forecast_scenarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    forecast_id: Mapped[str] = mapped_column(String(36), ForeignKey("multi_horizon_forecasts.id", ondelete="CASCADE"), index=True, nullable=False)
    
    scenario_type: Mapped[str] = mapped_column(String(50), nullable=False)  # CONTINUATION, ESCALATION, DE-ESCALATION
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    assumptions_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    supporting_evidence_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    opposing_evidence_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    affected_sectors_assets_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    relevant_network_paths_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    
    uncertainty: Mapped[str] = mapped_column(String(50), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    scenario_confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    forecast: Mapped[MultiHorizonForecast] = relationship("MultiHorizonForecast", back_populates="scenarios")


class ForecastAnalogueModel(Base):
    """
    Matched historical event analogue supporting a forecast.
    """
    __tablename__ = "forecast_analogues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    forecast_id: Mapped[str] = mapped_column(String(36), ForeignKey("multi_horizon_forecasts.id", ondelete="CASCADE"), index=True, nullable=False)
    
    historical_event_title: Mapped[str] = mapped_column(String(500), nullable=False)
    historical_date: Mapped[str] = mapped_column(String(100), nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    similarity_method: Mapped[str] = mapped_column(String(100), nullable=False)
    
    matching_attributes_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    observed_outcome: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    forecast: Mapped[MultiHorizonForecast] = relationship("MultiHorizonForecast", back_populates="analogues")
