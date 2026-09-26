"""
SQLAlchemy models for Inference History (Audit Logs) and AI Model Registry.
"""
from __future__ import annotations
import uuid
from sqlalchemy import String, Float, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models.base import Base, TimestampMixin


class AIModel(Base, TimestampMixin):
    """
    Registry of models deployed on the system.
    """
    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, deprecated


class InferenceHistory(Base, TimestampMixin):
    """
    Detailed audit log for every single AI inference call.
    """
    __tablename__ = "inference_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    operation: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # extract, classify, predict
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    execution_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    
    event_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    prediction_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)

    # Saved confidence metrics
    extraction_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    prediction_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    evidence_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    data_sources: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    warnings: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    errors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
