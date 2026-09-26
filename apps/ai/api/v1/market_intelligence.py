"""
FastAPI REST Router for GeoCap-X V6.2 Capital-Flow Signal Fusion Endpoints.
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select

from core.dependencies import DBSession
from models.event import ExtractedEvent
from models.event_market_intelligence import EventMarketIntelligence
from schemas.common import APIResponse
from providers.financial.yfinance_provider import RealYahooFinanceProvider
from capital_flow.event_mapping import EventAssetMapper
from capital_flow.event_window import EventWindowAnalyzer
from capital_flow.signal_fusion import SignalFusionEngine
from capital_flow.cross_asset import CrossAssetAnalyzer

router = APIRouter(prefix="/market-intelligence", tags=["Signal Fusion & Market Intelligence"])


@router.get("/event/{event_id}", response_model=APIResponse[dict])
async def get_event_market_intelligence(event_id: str, db: DBSession):
    """
    Perform 4-layer Signal Fusion for an extracted event.
    Returns Layer 1 (Event), Layer 2 (Network), Layer 3 (Market), Layer 4 (Data Quality),
    Fused Signal Score, and Interpretation Status.
    """
    stmt = select(ExtractedEvent).where(ExtractedEvent.id == event_id)
    res = await db.execute(stmt)
    ev = res.scalars().first()

    if not ev:
        raise HTTPException(status_code=404, detail=f"Event with ID '{event_id}' not found.")

    mappings = EventAssetMapper.map_event_to_instruments(ev)
    if not mappings:
        return APIResponse(
            success=True,
            data={
                "event_id": event_id,
                "interpretation_status": "UNMAPPED",
                "message": "Event cannot be mapped to observable market instruments."
            }
        )

    target_symbol = mappings[0]["instrument_symbol"]
    yf_provider = RealYahooFinanceProvider()
    obs = await yf_provider.get_observations(target_symbol, limit=90)

    ev_dt = ev.created_at
    window_res = EventWindowAnalyzer.analyze_window(ev_dt, obs)

    # Perform Cross-Asset Analysis for event category/sector
    category_key = ev.sectors[0] if ev.sectors else ev.category
    cross_asset_res = CrossAssetAnalyzer.analyze_cross_asset_alignment(category_key, {target_symbol: obs})

    # Fuse 4 signal layers
    fused_res = SignalFusionEngine.fuse_signals(
        event=ev,
        instrument_symbol=target_symbol,
        network_exposure_result=None,
        market_observations=obs,
        window_analysis_result=window_res,
        cross_asset_result=cross_asset_res
    )

    # Persist fused intelligence record
    intel_rec = EventMarketIntelligence(
        event_id=ev.id,
        instrument_symbol=target_symbol,
        observation_window=fused_res["observation_window"],
        layer1_event_signal=fused_res["layer1_event_signal"],
        layer2_network_signal=fused_res["layer2_network_signal"],
        layer3_market_signal=fused_res["layer3_market_signal"],
        layer4_data_quality=fused_res["layer4_data_quality"],
        fused_signal_score=fused_res["fused_signal_score"],
        interpretation_status=fused_res["interpretation_status"],
        cross_asset_alignment_json=fused_res["cross_asset_alignment_json"],
        methodology_version="v6.2"
    )
    db.add(intel_rec)
    await db.commit()

    return APIResponse(success=True, data=fused_res)


@router.get("/asset/{symbol}/events", response_model=APIResponse[list[dict]])
async def get_asset_event_history(symbol: str, db: DBSession, limit: int = Query(20, ge=1, le=100)):
    """
    Get historical event-aligned market intelligence signals for asset symbol.
    """
    stmt = (
        select(EventMarketIntelligence)
        .where(EventMarketIntelligence.instrument_symbol == symbol.strip().upper())
        .order_by(EventMarketIntelligence.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    items = res.scalars().all()

    out = []
    for i in items:
        out.append({
            "id": i.id,
            "event_id": i.event_id,
            "instrument_symbol": i.instrument_symbol,
            "fused_signal_score": i.fused_signal_score,
            "interpretation_status": i.interpretation_status,
            "layer1_event_signal": i.layer1_event_signal,
            "layer3_market_signal": i.layer3_market_signal,
            "created_at": i.created_at.isoformat() if hasattr(i.created_at, "isoformat") else str(i.created_at)
        })
    return APIResponse(success=True, data=out)


@router.get("/sector/{sector}", response_model=APIResponse[dict])
async def get_sector_market_analysis(sector: str):
    """
    Return aggregate evidence and cross-asset co-movement analysis across sector assets.
    """
    yf_provider = RealYahooFinanceProvider()
    obs_xlf = await yf_provider.get_observations("XLF", limit=60)
    obs_spy = await yf_provider.get_observations("SPY", limit=60)

    asset_map = {"XLF": obs_xlf, "SPY": obs_spy}
    cross_res = CrossAssetAnalyzer.analyze_cross_asset_alignment(sector, asset_map)

    return APIResponse(success=True, data={
        "sector": sector,
        "cross_asset_alignment": cross_res,
        "sample_assets": ["XLF", "SPY"],
        "methodology_version": "v6.2"
    })


@router.get("/signal-detail/{signal_id}", response_model=APIResponse[dict])
async def get_signal_detail(signal_id: str, db: DBSession):
    """
    Return full 4-layer breakdown of exact inputs contributing to a signal.
    """
    stmt = select(EventMarketIntelligence).where(EventMarketIntelligence.id == signal_id)
    res = await db.execute(stmt)
    rec = res.scalars().first()

    if not rec:
        raise HTTPException(status_code=404, detail=f"Signal record '{signal_id}' not found.")

    return APIResponse(success=True, data={
        "id": rec.id,
        "event_id": rec.event_id,
        "instrument_symbol": rec.instrument_symbol,
        "observation_window": rec.observation_window,
        "layer1_event_signal": rec.layer1_event_signal,
        "layer2_network_signal": rec.layer2_network_signal,
        "layer3_market_signal": rec.layer3_market_signal,
        "layer4_data_quality": rec.layer4_data_quality,
        "fused_signal_score": rec.fused_signal_score,
        "interpretation_status": rec.interpretation_status,
        "cross_asset_alignment": rec.cross_asset_alignment_json,
        "methodology_version": rec.methodology_version,
        "created_at": rec.created_at.isoformat() if hasattr(rec.created_at, "isoformat") else str(rec.created_at)
    })
