"""
Pydantic schemas for Event Chains and Graph representation.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class NodeOut(BaseModel):
    id: str
    chain_id: str
    event_id: str
    depth: int
    degree_centrality: float
    betweenness_centrality: float
    closeness_centrality: float
    eigenvector_centrality: float
    pagerank: float
    influence_score: float
    clustering_coefficient: float
    community_id: str | None = None
    
    # Nested event summary for easy rendering
    event_title: str | None = None
    event_category: str | None = None
    event_sentiment: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EdgeOut(BaseModel):
    id: str
    chain_id: str
    source_node_id: str
    target_node_id: str
    edge_weight: float
    relationship_type: str
    confidence: float
    time_lag_days: float
    evidence: dict[str, Any] | None = None
    created_by: str
    ai_version: str

    model_config = ConfigDict(from_attributes=True)


class ChainOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    root_event_id: str | None = None
    node_count: int
    max_depth: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GraphOut(BaseModel):
    chain: ChainOut
    nodes: list[NodeOut]
    edges: list[EdgeOut]


class ChainBuildReq(BaseModel):
    title: str = "Global Capital Flow Cascade"
    description: str | None = "Automatically generated DAG of geopolitical and macro events."
    time_window_days: int = 90

class PathEdgeOut(BaseModel):
    source_node_id: str
    target_node_id: str
    relationship_type: str
    confidence: float
    evidence: dict[str, Any] | None = None
    
    model_config = ConfigDict(from_attributes=True)

class EventPathOut(BaseModel):
    path: list[str]
    length: int
    confidence: float
    relationships: list[PathEdgeOut]
    
    model_config = ConfigDict(from_attributes=True)

class ConnectedEventOut(BaseModel):
    node_id: str
    event_id: str
    connection_type: str
    max_path_confidence: float
    
    model_config = ConfigDict(from_attributes=True)
