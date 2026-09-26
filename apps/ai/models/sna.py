"""
SQLAlchemy models for Social Network Analysis (SNA) graph-level stats.
"""
from __future__ import annotations
import uuid
from sqlalchemy import String, Float, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from models.base import Base, TimestampMixin


class NetworkAnalysisResult(Base, TimestampMixin):
    """
    Stores full graph statistics computed during SNA runs.
    """
    __tablename__ = "network_analysis_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chain_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    
    node_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    edge_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    network_density: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    clustering_coefficient: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    connected_components: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    graph_diameter: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_shortest_path: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    metric_status_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    community_summary_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    bridge_events_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

