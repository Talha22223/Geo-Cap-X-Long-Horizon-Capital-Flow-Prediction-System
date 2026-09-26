"""
REST API Router for Event Ingestion, Extraction, and Queries.
"""
from fastapi import APIRouter, Query, BackgroundTasks, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from core.dependencies import DBSession, NLPProvider
from core.exceptions import EventNotFoundException
from models.event import RawEvent, ExtractedEvent
from schemas.common import APIResponse, PaginatedResponse
from schemas.event import (
    ExtractedEventOut,
    RawEventOut,
    EventIngestReq,
    EventExtractReq,
    EventClassifyReq,
    CanonicalEventOut,
    EventQualityStatsOut
)
from models.event import RawEvent, ExtractedEvent, CanonicalEvent
from workers.queue import BackgroundQueueManager
from workers.job_manager import JobLifecycleManager
from workers.tasks.ingest_task import run_ingest_task
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])


@router.post("/ingest", response_model=APIResponse[dict], status_code=202)
async def trigger_ingestion(
    req: EventIngestReq,
    db: DBSession,
    bg_tasks: BackgroundTasks
):
    """
    Trigger ingestion pipeline for a target source in a non-blocking background task.
    """
    job = await JobLifecycleManager.create_job(db, "ingest")
    
    # Enqueue task (using FastAPI BackgroundTasks as a local fallback to avoid strict Redis requirements in tests)
    bg_tasks.add_task(
        run_ingest_task,
        job.id,
        req.source,
        feed_url=req.feed_url
    )

    return APIResponse(
        success=True,
        data={"job_id": job.id, "status": "PENDING", "source": req.source}
    )


@router.post("/extract", response_model=APIResponse[dict])
async def extract_entities(req: EventExtractReq, nlp: NLPProvider):
    """
    Synchronously extract entities from target raw text.
    """
    res = await nlp.extract_entities(req.text)
    return APIResponse(success=True, data=res.model_dump())


@router.post("/classify", response_model=APIResponse[dict])
async def classify_event(req: EventClassifyReq, nlp: NLPProvider):
    """
    Synchronously classify category and sentiment of target raw text.
    """
    sentiment = await nlp.calculate_sentiment(req.text)
    category = await nlp.classify_event(req.text)
    
    return APIResponse(
        success=True,
        data={
            "sentiment": sentiment.sentiment,
            "polarity": sentiment.polarity,
            "primary_category": category.primary_category,
            "secondary_categories": category.secondary_categories,
            "confidence": category.classification_confidence
        }
    )


@router.get("", response_model=APIResponse[PaginatedResponse[ExtractedEventOut]])
async def list_events(
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    category: str | None = None,
    sentiment: str | None = None,
    country: str | None = None,
):
    """
    Query paginated list of extracted events with optional filtering.
    """
    stmt = select(ExtractedEvent)
    
    if category:
        stmt = stmt.where(ExtractedEvent.category == category.upper())
    if sentiment:
        stmt = stmt.where(ExtractedEvent.sentiment == sentiment.upper())
    if country:
        stmt = stmt.where(ExtractedEvent.country == country)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Limit and offset
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)
    
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    pages = (total + size - 1) // size

    return APIResponse(
        success=True,
        data=PaginatedResponse(
            items=[ExtractedEventOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
            pages=pages
        )
    )

@router.get("/canonical", response_model=APIResponse[PaginatedResponse[CanonicalEventOut]])
async def list_canonical_events(
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
):
    """
    Query paginated list of canonical clustered events.
    """
    stmt = select(CanonicalEvent).options(selectinload(CanonicalEvent.extracted_events))
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size).order_by(CanonicalEvent.event_time_start.desc())
    
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    pages = (total + size - 1) // size

    return APIResponse(
        success=True,
        data=PaginatedResponse(
            items=[CanonicalEventOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
            pages=pages
        )
    )

@router.get("/canonical/{id}", response_model=APIResponse[CanonicalEventOut])
async def get_canonical_event(id: str, db: DBSession):
    """
    Get detailed properties of a specific canonical event, including linked extraction candidates.
    """
    stmt = select(CanonicalEvent).where(CanonicalEvent.id == id).options(selectinload(CanonicalEvent.extracted_events))
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise EventNotFoundException(id)
    return APIResponse(success=True, data=CanonicalEventOut.model_validate(item))

@router.get("/stats", response_model=APIResponse[EventQualityStatsOut])
async def get_event_stats(db: DBSession):
    """
    Get event quality, resolution and clustering statistics.
    """
    total_raw = (await db.execute(select(func.count(RawEvent.id)))).scalar() or 0
    total_ext = (await db.execute(select(func.count(ExtractedEvent.id)))).scalar() or 0
    total_can = (await db.execute(select(func.count(CanonicalEvent.id)))).scalar() or 0
    
    avg_cluster_size = total_ext / total_can if total_can > 0 else 0.0
    
    unresolved = (await db.execute(select(func.count(CanonicalEvent.id)).where(CanonicalEvent.confidence < 0.5))).scalar() or 0
    conflicts = (await db.execute(select(func.count(CanonicalEvent.id)).where(CanonicalEvent.has_conflicting_evidence == True))).scalar() or 0
    
    return APIResponse(
        success=True,
        data=EventQualityStatsOut(
            total_raw_articles=total_raw,
            total_extracted_candidates=total_ext,
            total_canonical_events=total_can,
            average_cluster_size=round(avg_cluster_size, 2),
            unresolved_or_low_confidence_events=unresolved,
            events_with_conflicts=conflicts
        )
    )

@router.get("/search", response_model=APIResponse[list[ExtractedEventOut]])
async def search_events(db: DBSession, q: str = Query(..., min_length=2)):
    """
    Perform full-text search against event titles and bodies.
    """
    stmt = select(ExtractedEvent).where(
        ExtractedEvent.title.ilike(f"%{q}%") | ExtractedEvent.body.ilike(f"%{q}%")
    ).limit(30)
    res = await db.execute(stmt)
    items = res.scalars().all()
    return APIResponse(success=True, data=[ExtractedEventOut.model_validate(i) for i in items])


@router.get("/{id}", response_model=APIResponse[ExtractedEventOut])
async def get_event(id: str, db: DBSession):
    """
    Get detailed properties of a specific extracted event.
    """
    stmt = select(ExtractedEvent).where(ExtractedEvent.id == id).options(selectinload(ExtractedEvent.entities))
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise EventNotFoundException(id)
    return APIResponse(success=True, data=ExtractedEventOut.model_validate(item))
