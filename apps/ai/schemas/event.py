"""
Pydantic schemas for events.
"""
from datetime import datetime, date
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class EntityOut(BaseModel):
    id: str
    entity_type: str
    entity_value: str

    model_config = ConfigDict(from_attributes=True)


class ExtractedEventOut(BaseModel):
    id: str
    raw_event_id: str
    canonical_event_id: str | None = None
    title: str
    body: str
    
    summary: str | None = None
    subtype: str | None = None
    
    countries: list[str] | None = None
    regions: list[str] | None = None
    sectors: list[str] | None = None
    asset_classes: list[str] | None = None
    commodities: list[str] | None = None
    
    industry: str | None = None
    company: str | None = None
    currency: str | None = None
    
    organizations: list[str] | None = None
    people: list[str] | None = None
    event_date: date | None = None
    severity: float
    keywords: list[str] | None = None
    category: str
    sentiment: str
    
    publication_timestamp: datetime | None = None
    source_provider: str | None = None
    source_url: str | None = None
    data_origin: str | None = None
    extraction_method: str | None = None
    
    extraction_confidence: float
    classification_confidence: float
    overall_confidence: float
    
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RawEventOut(BaseModel):
    id: str
    source_id: str
    source_type: str
    external_id: str | None = None
    title: str
    body: str
    url: str | None = None
    published_at: datetime
    content_hash: str
    is_processed: bool
    metadata_json: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    extracted_event: ExtractedEventOut | None = None

    model_config = ConfigDict(from_attributes=True)


class EventIngestReq(BaseModel):
    source: str = Field("seed", description="The source adapter to run. e.g., seed, rss, manual")
    feed_url: str | None = Field(None, description="Optional custom URL for RSS ingestion")


class EventExtractReq(BaseModel):
    text: str = Field(..., min_length=10, description="Raw financial news or event text")


class EventClassifyReq(BaseModel):
    text: str = Field(..., min_length=10, description="Raw financial news or event text")

class CanonicalEventOut(BaseModel):
    id: str
    title: str
    summary: str | None = None
    
    category: str
    severity: float
    confidence: float
    
    countries: list[str] | None = None
    regions: list[str] | None = None
    sectors: list[str] | None = None
    organizations: list[str] | None = None
    people: list[str] | None = None
    
    event_time_start: datetime | None = None
    event_time_end: datetime | None = None
    
    supporting_article_count: int
    independent_source_count: int
    
    has_conflicting_evidence: bool
    conflict_details: str | None = None
    
    created_at: datetime
    updated_at: datetime
    
    extracted_events: list[ExtractedEventOut] | None = None

    model_config = ConfigDict(from_attributes=True)

class EventQualityStatsOut(BaseModel):
    total_raw_articles: int
    total_extracted_candidates: int
    total_canonical_events: int
    average_cluster_size: float
    unresolved_or_low_confidence_events: int
    events_with_conflicts: int
