"""
SQLAlchemy models for Network Exposure & Propagation Results.
"""
from __future__ import annotations
import uuid
from sqlalchemy import String, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models.base import Base, TimestampMixin


class EventExposureResult(Base, TimestampMixin):
    """
    Stores full network exposure analysis results for canonical events.
    """
    __tablename__ = "event_exposure_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chain_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    source_event_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)

    exposure_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    exposure_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
