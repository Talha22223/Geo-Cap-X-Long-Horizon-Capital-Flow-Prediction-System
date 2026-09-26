"""
SQLAlchemy ORM model for GeoCap-X V6.2 Signal Fusion & Event-Market Intelligence Results.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base, TimestampMixin


class EventMarketIntelligence(Base, TimestampMixin):
    """
    Fused 4-Layer Event-Market Intelligence Result.
    Stores Layer 1 (Event), Layer 2 (Network Exposure), Layer 3 (Market Signals), and Layer 4 (Data Quality).
    """
    __tablename__ = "event_market_intelligence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("extracted_events.id", ondelete="CASCADE"), index=True, nullable=False)
    instrument_symbol: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    observation_window: Mapped[str] = mapped_column(String(50), default="[-30_DAYS, +5_DAYS]", nullable=False)

    # 4 Separately Visible Signal Layers
    layer1_event_signal: Mapped[dict] = mapped_column(JSON, nullable=False)
    layer2_network_signal: Mapped[dict] = mapped_column(JSON, nullable=False)
    layer3_market_signal: Mapped[dict] = mapped_column(JSON, nullable=False)
    layer4_data_quality: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Fused Metrics & Status
    fused_signal_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    interpretation_status: Mapped[str] = mapped_column(String(50), index=True, nullable=False) # ALIGNED_HIGH_CONFIDENCE, MIXED_EVIDENCE, UNCONFIRMED_EVENT_SIGNAL, INSUFFICIENT_EVIDENCE
    cross_asset_alignment_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    methodology_version: Mapped[str] = mapped_column(String(20), default="v6.2", nullable=False)
