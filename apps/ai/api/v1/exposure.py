"""
REST API Router for Network Exposure & Graph Propagation Analysis.
"""
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select

from core.dependencies import DBSession
from core.exceptions import EventNotFoundException
from models.exposure import EventExposureResult
from event_chain.propagation import EventPropagationEngine
from schemas.common import APIResponse
from schemas.exposure import (
    NetworkExposureSummaryOut,
    PropagationPathOut,
    SectorExposureOut,
    RegionalExposureOut,
)

router = APIRouter(prefix="/exposure", tags=["Network Exposure & Propagation Analysis"])


@router.get("/event/{event_id}", response_model=APIResponse[NetworkExposureSummaryOut])
async def get_event_exposure(
    event_id: str,
    db: DBSession,
    chain_name: str = Query(default="Global Capital Flow Cascade"),
    recalculate: bool = Query(default=False)
):
    """
    Get full network exposure assessment for a specific source canonical event.
    """
    stmt = select(EventExposureResult).where(EventExposureResult.source_event_id == event_id)
    res = await db.execute(stmt)
    record = res.scalars().first()

    if not record or recalculate:
        engine = EventPropagationEngine(db)
        record = await engine.analyze_event_exposure(event_id, chain_id=chain_name)

    if not record or not record.exposure_json:
        raise HTTPException(status_code=404, detail=f"Exposure analysis for event {event_id} not found.")

    out = NetworkExposureSummaryOut.model_validate(record.exposure_json)
    return APIResponse(success=True, data=out)


@router.get("/event/{event_id}/paths", response_model=APIResponse[list[PropagationPathOut]])
async def get_event_propagation_paths(
    event_id: str,
    db: DBSession,
    chain_name: str = Query(default="Global Capital Flow Cascade")
):
    """
    Get ranked propagation transmission paths originating from a source event.
    """
    stmt = select(EventExposureResult).where(EventExposureResult.source_event_id == event_id)
    res = await db.execute(stmt)
    record = res.scalars().first()

    if not record:
        engine = EventPropagationEngine(db)
        record = await engine.analyze_event_exposure(event_id, chain_id=chain_name)

    payload = record.exposure_json or {}
    raw_paths = payload.get("top_propagation_paths", [])
    out = [PropagationPathOut.model_validate(p) for p in raw_paths]
    return APIResponse(success=True, data=out)


@router.get("/event/{event_id}/sectors", response_model=APIResponse[list[SectorExposureOut]])
async def get_event_sector_exposure(
    event_id: str,
    db: DBSession,
    chain_name: str = Query(default="Global Capital Flow Cascade")
):
    """
    Get sector exposure summary derived from connected event graph transmission paths.
    """
    stmt = select(EventExposureResult).where(EventExposureResult.source_event_id == event_id)
    res = await db.execute(stmt)
    record = res.scalars().first()

    if not record:
        engine = EventPropagationEngine(db)
        record = await engine.analyze_event_exposure(event_id, chain_id=chain_name)

    payload = record.exposure_json or {}
    raw_sectors = payload.get("exposed_sectors", [])
    out = [SectorExposureOut.model_validate(s) for s in raw_sectors]
    return APIResponse(success=True, data=out)


@router.get("/event/{event_id}/regions", response_model=APIResponse[list[RegionalExposureOut]])
async def get_event_regional_exposure(
    event_id: str,
    db: DBSession,
    chain_name: str = Query(default="Global Capital Flow Cascade")
):
    """
    Get regional & geographic exposure summary derived from connected event graph transmission paths.
    """
    stmt = select(EventExposureResult).where(EventExposureResult.source_event_id == event_id)
    res = await db.execute(stmt)
    record = res.scalars().first()

    if not record:
        engine = EventPropagationEngine(db)
        record = await engine.analyze_event_exposure(event_id, chain_id=chain_name)

    payload = record.exposure_json or {}
    raw_regions = payload.get("exposed_regions", [])
    out = [RegionalExposureOut.model_validate(r) for r in raw_regions]
    return APIResponse(success=True, data=out)
