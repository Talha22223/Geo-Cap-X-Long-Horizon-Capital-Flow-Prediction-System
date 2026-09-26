"""
SQLAlchemy models for Real Market Intelligence, Observations, Derived Indicators, and Event Mappings.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base, TimestampMixin


class MarketObservation(Base, TimestampMixin):
    """
    Standardized Market Observation Model.
    Stores observed market proxy & flow data (OHLCV, volume, yields, liquidity metrics).
    """
    __tablename__ = "market_observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    instrument_symbol: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    asset_class: Mapped[str] = mapped_column(String(50), nullable=False)  # EQUITY, ETF, FX, BOND, COMMODITY, MACRO
    market: Mapped[str] = mapped_column(String(50), nullable=False)        # US_EQUITY, FOREX, US_TREASURY, GLOBAL_MACRO
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)

    open_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    high_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    low_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    close_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)

    source: Mapped[str] = mapped_column(String(50), index=True, nullable=False)             # YAHOO_FINANCE, WORLD_BANK, FRED
    source_identifier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ingestion_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    data_quality: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    data_origin: Mapped[str] = mapped_column(String(50), index=True, nullable=False)        # DIRECT_FLOW_DATA, MARKET_PROXY_DATA, MACRO_LIQUIDITY_DATA


class DerivedMarketIndicator(Base, TimestampMixin):
    """
    Derived Market Activity & Proxy Calculations.
    Stores calculated indicators with exact formulas, source variables, and calculation timestamps.
    """
    __tablename__ = "derived_market_indicators"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    instrument_symbol: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    indicator_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False) # ABNORMAL_VOLUME_SIGNAL, MARKET_ACTIVITY_SIGNAL, LIQUIDITY_PROXY, VOLATILITY_CHANGE_SIGNAL
    category: Mapped[str] = mapped_column(String(50), nullable=False)                    # MARKET_PROXY_DATA, MACRO_LIQUIDITY_DATA, EVENT_RELATED_DERIVED_SIGNAL

    value: Mapped[float] = mapped_column(Float, nullable=False)
    z_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    formula: Mapped[str] = mapped_column(Text, nullable=False)
    source_variables: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    time_window: Mapped[str] = mapped_column(String(50), nullable=False)                 # e.g., 30_DAY_BASELINE
    calculation_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    methodology_version: Mapped[str] = mapped_column(String(20), default="v6.1", nullable=False)


class EventAssetMapping(Base, TimestampMixin):
    """
    Transparent mapping connecting Extracted Events to observable market instruments.
    """
    __tablename__ = "event_asset_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("extracted_events.id", ondelete="CASCADE"), index=True, nullable=False)
    instrument_symbol: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    asset_class: Mapped[str] = mapped_column(String(50), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mapping_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    mapping_rule: Mapped[str] = mapped_column(String(100), nullable=False)               # e.g. SECTOR_TO_ETF, MONETARY_TO_BOND_FX


class EventWindowAnalysis(Base, TimestampMixin):
    """
    Window analysis around canonical events (Pre-event baseline, Immediate, Post-event).
    """
    __tablename__ = "event_window_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("extracted_events.id", ondelete="CASCADE"), index=True, nullable=False)
    instrument_symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    pre_event_baseline_mean: Mapped[float | None] = mapped_column(Float, nullable=True)
    pre_event_baseline_std: Mapped[float | None] = mapped_column(Float, nullable=True)
    event_day_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    post_event_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    abnormality_z_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    signal_type: Mapped[str] = mapped_column(String(100), nullable=False)                 # EVENT_ALIGNED_MARKET_SIGNAL, EVENT_RELATED_MARKET_ANOMALY
    data_quality_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    signal_strength: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    supporting_sources: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)


class DataSourceMetadata(Base, TimestampMixin):
    """
    Data Source Connectivity & Freshness Tracking.
    """
    __tablename__ = "data_source_metadata"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider_name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)                    # DIRECT_FLOW_DATA, MARKET_PROXY_DATA, MACRO_LIQUIDITY_DATA
    status: Mapped[str] = mapped_column(String(20), nullable=False)                      # ACTIVE, NOT_CONFIGURED, UNAVAILABLE
    last_successful_fetch: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_freshness_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
