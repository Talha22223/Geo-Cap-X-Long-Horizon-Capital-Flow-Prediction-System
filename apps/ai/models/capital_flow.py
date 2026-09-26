"""
SQLAlchemy models for Capital Flow Predictions, Evidence, and Scenarios.
"""
from __future__ import annotations
import uuid
from sqlalchemy import String, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base, TimestampMixin


class CapitalFlowPrediction(Base, TimestampMixin):
    """
    Output of the Capital Flow Engine.
    Represents predicted flows across country/region/sector/currencies.
    """
    __tablename__ = "capital_flow_predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Target entities
    affected_country: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    affected_region: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    affected_sector: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    affected_industry: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    
    currency: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    asset_class: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    direction: Mapped[str] = mapped_column(String(50), nullable=False)  # INFLOW, OUTFLOW, NEUTRAL, MIXED
    estimated_rotation_usd_bn: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    time_horizon: Mapped[str] = mapped_column(String(50), nullable=False)  # SIX_MONTHS, ONE_YEAR, THREE_YEARS, FIVE_YEARS

    # Confidence Model (4 separate confidence scores)
    extraction_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    classification_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    prediction_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    historical_similarity: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)

    # Relationships
    evidence: Mapped[list[PredictionEvidence]] = relationship(
        "PredictionEvidence", back_populates="prediction", cascade="all, delete-orphan"
    )
    alternative_scenarios: Mapped[list[AlternativeScenario]] = relationship(
        "AlternativeScenario", back_populates="prediction", cascade="all, delete-orphan"
    )


class PredictionEvidence(Base):
    """
    Documents exactly why a prediction was generated (explainability).
    """
    __tablename__ = "prediction_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_id: Mapped[str] = mapped_column(String(36), ForeignKey("capital_flow_predictions.id", ondelete="CASCADE"), index=True, nullable=False)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("extracted_events.id", ondelete="CASCADE"), index=True, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    impact_direction: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., supportive, opposing

    # Relationships
    prediction: Mapped[CapitalFlowPrediction] = relationship("CapitalFlowPrediction", back_populates="evidence")


class AlternativeScenario(Base):
    """
    Alternate probability-weighted scenarios for capital rotation.
    """
    __tablename__ = "alternative_scenarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_id: Mapped[str] = mapped_column(String(36), ForeignKey("capital_flow_predictions.id", ondelete="CASCADE"), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., Bull Case, Bear Case, Base Case
    description: Mapped[str] = mapped_column(Text, nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    prediction: Mapped[CapitalFlowPrediction] = relationship("CapitalFlowPrediction", back_populates="alternative_scenarios")
