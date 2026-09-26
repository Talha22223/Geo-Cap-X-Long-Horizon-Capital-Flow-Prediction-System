"""
SQLAlchemy models for Event Chains, Nodes, and Edges (Directed Causal DAG).
"""
from __future__ import annotations
import uuid
from typing import Any, TYPE_CHECKING
from sqlalchemy import String, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from models.event import ExtractedEvent


class EventChain(Base, TimestampMixin):
    """
    Groups causally linked events into a named, visualizable chain.
    """
    __tablename__ = "event_chains"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    root_event_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    node_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_depth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Relationships
    nodes: Mapped[list[EventChainNode]] = relationship(
        "EventChainNode", back_populates="chain", cascade="all, delete-orphan"
    )
    edges: Mapped[list[EventChainEdge]] = relationship(
        "EventChainEdge", back_populates="chain", cascade="all, delete-orphan"
    )


class EventChainNode(Base):
    """
    Represents an event node within a chain, hosting centralities.
    """
    __tablename__ = "event_chain_nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chain_id: Mapped[str] = mapped_column(String(36), ForeignKey("event_chains.id", ondelete="CASCADE"), index=True, nullable=False)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("extracted_events.id", ondelete="CASCADE"), unique=True, nullable=False)
    depth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # SNA metrics hosted on the node
    degree_centrality: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    betweenness_centrality: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    closeness_centrality: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    eigenvector_centrality: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pagerank: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    influence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    clustering_coefficient: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    community_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    chain: Mapped[EventChain] = relationship("EventChain", back_populates="nodes")
    event: Mapped[ExtractedEvent] = relationship("ExtractedEvent", back_populates="chain_node")


class EventChainEdge(Base):
    """
    Directed causal relationship between two events.
    """
    __tablename__ = "event_chain_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chain_id: Mapped[str] = mapped_column(String(36), ForeignKey("event_chains.id", ondelete="CASCADE"), index=True, nullable=False)
    source_node_id: Mapped[str] = mapped_column(String(36), ForeignKey("event_chain_nodes.id", ondelete="CASCADE"), index=True, nullable=False)
    target_node_id: Mapped[str] = mapped_column(String(36), ForeignKey("event_chain_nodes.id", ondelete="CASCADE"), index=True, nullable=False)
    
    edge_weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., direct, indirect, correlated
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    time_lag_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    evidence: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String(100), default="ai-system", nullable=False)
    ai_version: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    chain: Mapped[EventChain] = relationship("EventChain", back_populates="edges")
    source_node: Mapped[EventChainNode] = relationship("EventChainNode", foreign_keys=[source_node_id])
    target_node: Mapped[EventChainNode] = relationship("EventChainNode", foreign_keys=[target_node_id])
