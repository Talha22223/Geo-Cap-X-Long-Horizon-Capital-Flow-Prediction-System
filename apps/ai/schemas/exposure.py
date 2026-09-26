"""
Pydantic schemas for Network Exposure & Graph Propagation Analysis.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class PathStepDetail(BaseModel):
    source_node_id: str
    target_node_id: str
    relationship_type: str
    confidence: float


class PropagationPathOut(BaseModel):
    path_nodes: list[str]
    target_node_id: str | None = None
    hops: int
    path_confidence: float
    steps: list[PathStepDetail]
    explanation: str


class ExposedEventOut(BaseModel):
    node_id: str
    event_id: str
    event_title: str
    category: str
    exposure_level: str
    combined_exposure_confidence: float
    min_hops: int
    path_count: int
    strongest_path: PropagationPathOut
    explanation: str


class SectorExposureOut(BaseModel):
    sector: str
    exposure_score: float
    event_count: int
    explanation: str


class RegionalExposureOut(BaseModel):
    region: str
    exposure_score: float
    event_count: int
    explanation: str


class CommunityExposureSummaryOut(BaseModel):
    primary_community: str
    connected_communities: list[str]
    bridge_events_traversed: list[str]
    cross_community_propagation_description: str


class NetworkExposureSummaryOut(BaseModel):
    source_event_id: str
    source_event_title: str
    source_category: str
    composite_exposure_score: float
    directly_exposed_events: list[ExposedEventOut]
    indirectly_exposed_events: list[ExposedEventOut]
    low_confidence_events: list[ExposedEventOut]
    exposed_sectors: list[SectorExposureOut]
    exposed_regions: list[RegionalExposureOut]
    community_exposure: CommunityExposureSummaryOut
    top_propagation_paths: list[PropagationPathOut]
    disclaimer: str
