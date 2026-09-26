"""
SQLAlchemy models for events and entities.
"""
from __future__ import annotations
import uuid
from datetime import datetime, date
from typing import Any
from sqlalchemy import String, Text, Boolean, Float, Date, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base, TimestampMixin


class RawEvent(Base, TimestampMixin):
    """
    Stores all raw events fetched from various adapters before extraction.
    """
    __tablename__ = "raw_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., SEED, RSS, NEWSAPI, FRED
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Relationships
    extracted_event: Mapped[ExtractedEvent | None] = relationship(
        "ExtractedEvent", back_populates="raw_event", cascade="all, delete-orphan"
    )


class CanonicalEvent(Base, TimestampMixin):
    """
    Resolved underlying real-world event supported by multiple extracted candidates.
    """
    __tablename__ = "canonical_events"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    severity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    countries: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    regions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    sectors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    organizations: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    people: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    
    event_time_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    event_time_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    supporting_article_count: Mapped[int] = mapped_column(default=1, nullable=False)
    independent_source_count: Mapped[int] = mapped_column(default=1, nullable=False)
    
    # Resolves ambiguity/conflicts
    has_conflicting_evidence: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    conflict_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Relationships
    extracted_events: Mapped[list[ExtractedEvent]] = relationship(
        "ExtractedEvent", back_populates="canonical_event"
    )

class ExtractedEvent(Base, TimestampMixin):
    """
    Structured, processed, and classified event metadata.
    """
    __tablename__ = "extracted_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    raw_event_id: Mapped[str] = mapped_column(String(36), ForeignKey("raw_events.id", ondelete="CASCADE"), unique=True, nullable=False)
    canonical_event_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("canonical_events.id", ondelete="SET NULL"), index=True, nullable=True)
    
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtype: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    
    # Plural Arrays for multiple entity associations
    countries: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    regions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    sectors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    asset_classes: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    commodities: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    
    # Scalar properties
    industry: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    organizations: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    people: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    severity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    keywords: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    sentiment: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # BULLISH, BEARISH, NEUTRAL
    
    # Source / Provenance
    publication_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_provider: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    data_origin: Mapped[str | None] = mapped_column(String(100), nullable=True)
    extraction_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Confidence metrics
    extraction_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    classification_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    raw_event: Mapped[RawEvent] = relationship("RawEvent", back_populates="extracted_event")
    canonical_event: Mapped[CanonicalEvent | None] = relationship("CanonicalEvent", back_populates="extracted_events")
    entities: Mapped[list[EventEntity]] = relationship(
        "EventEntity", back_populates="event", cascade="all, delete-orphan"
    )
    chain_node: Mapped[EventChainNode | None] = relationship(
        "EventChainNode", back_populates="event", cascade="all, delete-orphan"
    )


class EventEntity(Base):
    """
    Sub-table storing entities associated with extracted events for optimized queries/indices.
    """
    __tablename__ = "event_entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("extracted_events.id", ondelete="CASCADE"), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # e.g., country, region, currency
    entity_value: Mapped[str] = mapped_column(String(255), index=True, nullable=False)

    # Relationships
    event: Mapped[ExtractedEvent] = relationship("ExtractedEvent", back_populates="entities")
