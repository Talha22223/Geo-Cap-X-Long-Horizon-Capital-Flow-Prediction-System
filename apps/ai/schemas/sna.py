"""
Pydantic schemas for Social Network Analysis metrics & Graph Intelligence.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class MetricStatusDetail(BaseModel):
    status: str
    reason: str
    algorithm: str


class SNAStatsOut(BaseModel):
    id: str
    chain_id: str
    node_count: int
    edge_count: int
    total_nodes: int | None = None
    total_edges: int | None = None
    network_density: float
    density: float | None = None
    clustering_coefficient: float
    connected_components: int
    graph_diameter: float | None = None
    avg_shortest_path: float | None = None
    community_count: int | None = None
    bridge_event_count: int | None = None
    bridge_nodes: list[dict[str, Any]] | None = None
    communities: list[dict[str, Any]] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CentralityOut(BaseModel):
    event_id: str
    event_title: str
    influence_score: float
    pagerank: float
    degree_centrality: float
    betweenness_centrality: float
    closeness_centrality: float
    eigenvector_centrality: float
    community_id: str | None = None


class InfluenceDimensionDetail(BaseModel):
    raw: float
    normalized: float
    level: str
    weight: float


class InfluenceContributions(BaseModel):
    network_influence: InfluenceDimensionDetail
    bridge_importance: InfluenceDimensionDetail
    direct_connectivity: InfluenceDimensionDetail
    eigenvector_significance: InfluenceDimensionDetail


class TopInfluentialEventOut(BaseModel):
    node_id: str
    event_id: str
    event_title: str
    category: str
    influence_score: float
    contributions: InfluenceContributions
    explanation: str


class BridgeEventOut(BaseModel):
    node_id: str
    event_id: str
    event_title: str
    bridge_importance: float
    normalized_bridge_importance: float
    inter_community_edge_count: int
    connected_communities: list[str]
    structural_role_description: str


class CommunityEventDetail(BaseModel):
    node_id: str
    event_id: str
    title: str
    category: str
    influence_score: float


class CommunityDetailOut(BaseModel):
    community_id: str
    label: str
    confidence: float
    event_count: int
    dominant_category: str
    category_breakdown: dict[str, int]
    dominant_sectors: list[str]
    dominant_entities: list[str]
    events: list[CommunityEventDetail]


class GraphSummaryOut(BaseModel):
    chain_id: str
    node_count: int
    edge_count: int
    network_density: float
    clustering_coefficient: float
    connected_components: int
    graph_diameter: float | None = None
    avg_shortest_path: float | None = None
    metric_statuses: dict[str, MetricStatusDetail]
    community_count: int
    bridge_event_count: int
    snapshot_metadata: dict[str, Any]
    created_at: datetime
