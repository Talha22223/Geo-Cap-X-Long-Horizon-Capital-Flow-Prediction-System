"""
Pydantic schemas for GEOCAP-X V8.1 Unified Explanation & Provenance REST API.
"""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


class SourceProvenanceOut(BaseModel):
    provider: str
    external_id: str | None = None
    source_url: str | None = None
    published_at: str | None = None
    ingestion_timestamp: str | None = None
    processing_timestamp: str | None = None
    data_origin: str = "PIPELINE"
    methodology_version: str = "v8.1"
    data_quality_score: float = 1.0
    status: str = "VERIFIED"


class DataFreshnessOut(BaseModel):
    freshness_status: str
    freshness_age_hours: float | None = None
    threshold_hours: float
    stale_threshold_hours: float | None = None
    is_usable: bool
    summary: str


class TraceabilityChainItemOut(BaseModel):
    stage_index: int
    stage_name: str
    record_id: str
    timestamp: str
    status: str
    summary: str


class SeparatedConfidenceOut(BaseModel):
    extraction_confidence: float
    classification_confidence: float
    relationship_confidence: float
    graph_centrality_score: float
    market_baseline_quality: float
    market_signal_strength: float
    scenario_confidence: float
    fused_overall_score: float
    methodology: str = "7_FACTOR_WEIGHTED_FUSION_V8.1"


class ExplanationOut(BaseModel):
    result_summary: str
    provenance: SourceProvenanceOut | None = None
    data_freshness: DataFreshnessOut | None = None
    traceability_chain: list[TraceabilityChainItemOut] = Field(default_factory=list)
    inputs_used: dict[str, Any] = Field(default_factory=dict)
    calculations_breakdown: dict[str, Any] = Field(default_factory=dict)
    confidence_breakdown: SeparatedConfidenceOut | None = None
    conflict_analysis: dict[str, Any] = Field(default_factory=dict)
    supporting_evidence: list[str] = Field(default_factory=list)
    opposing_evidence: list[str] = Field(default_factory=list)
    methodology_versions: dict[str, str] = Field(default_factory=dict)
    limitations: list[str] = Field(default_factory=list)
    is_traceable: bool = True
