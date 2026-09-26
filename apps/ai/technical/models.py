"""
SQLAlchemy models for Technical Analysis, Market Structure, and Patterns.
"""
from __future__ import annotations
import uuid
from sqlalchemy import String, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models.base import Base, TimestampMixin


class TechnicalAnalysisResult(Base, TimestampMixin):
    """
    Stores computed technical analysis indicators for a symbol and timeframe.
    """
    __tablename__ = "technical_analysis_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), index=True, nullable=False)  # 1H, 4H, 1D, 1W, 1M, etc.
    
    # Store all indicators as a nested JSON structure
    indicators: Mapped[dict] = mapped_column(JSON, nullable=False)


class MarketStructureResult(Base, TimestampMixin):
    """
    Stores detected market structure components (S/R zones, trend classifications).
    """
    __tablename__ = "market_structure_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    
    trend: Mapped[str] = mapped_column(String(20), nullable=False)  # BULLISH, BEARISH, NEUTRAL
    trend_strength: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # JSON containing support/resistance levels and pivots (swing highs/lows)
    structure_data: Mapped[dict] = mapped_column(JSON, nullable=False)


class PatternDetectionResult(Base, TimestampMixin):
    """
    Stores chart patterns detected in historical price action.
    """
    __tablename__ = "pattern_detection_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    
    pattern_name: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # e.g., Head and Shoulders
    pattern_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BULLISH, BEARISH
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # JSON detailing pattern start/end indices, prices, targets
    details: Mapped[dict] = mapped_column(JSON, nullable=False)
