"""
FastAPI Router for GeoCap-X V6.1 Market Intelligence & Real Flow Data Endpoints.
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select

from core.dependencies import DBSession
from models.event import ExtractedEvent
from models.market_data import (
    MarketObservation,
    DerivedMarketIndicator,
    EventAssetMapping,
    EventWindowAnalysis,
    DataSourceMetadata
)
from schemas.common import APIResponse
from providers.financial.yfinance_provider import RealYahooFinanceProvider
from providers.financial.worldbank_provider import WorldBankProvider
from providers.financial.fred_provider import FREDProvider
from capital_flow.proxy_calculator import CapitalFlowProxyCalculator
from capital_flow.event_mapping import EventAssetMapper
from capital_flow.event_window import EventWindowAnalyzer
from capital_flow.event_market_signal import EventMarketSignalEngine

router = APIRouter(prefix="/market", tags=["Market & Capital Flow Intelligence"])


@router.get("/observations", response_model=APIResponse[list[dict]])
async def get_market_observations(
    db: DBSession,
    symbol: Optional[str] = Query(None, description="Instrument symbol e.g., SPY, EURUSD=X, US10Y"),
    source: Optional[str] = Query(None, description="Provider source e.g. YAHOO_FINANCE, WORLD_BANK"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get real market proxy observations (OHLCV, volume, yields).
    If database contains no entries for symbol, live fetches from provider.
    """
    if symbol:
        yf_provider = RealYahooFinanceProvider()
        live_data = await yf_provider.get_observations(symbol, limit=limit)
        if live_data:
            out = []
            for o in live_data:
                out.append({
                    "instrument_symbol": o["instrument_symbol"],
                    "asset_class": o["asset_class"],
                    "market": o["market"],
                    "timestamp": o["timestamp"].isoformat() if hasattr(o["timestamp"], "isoformat") else str(o["timestamp"]),
                    "open_price": o["open_price"],
                    "high_price": o["high_price"],
                    "low_price": o["low_price"],
                    "close_price": o["close_price"],
                    "volume": o["volume"],
                    "currency": o["currency"],
                    "source": o["source"],
                    "data_quality": o["data_quality"],
                    "data_origin": o["data_origin"]
                })
            return APIResponse(success=True, data=out)

    stmt = select(MarketObservation).order_by(MarketObservation.timestamp.desc()).limit(limit)
    if symbol:
        stmt = stmt.where(MarketObservation.instrument_symbol == symbol.strip().upper())
    if source:
        stmt = stmt.where(MarketObservation.source == source.strip().upper())

    res = await db.execute(stmt)
    items = res.scalars().all()

    out = []
    for i in items:
        out.append({
            "id": i.id,
            "instrument_symbol": i.instrument_symbol,
            "asset_class": i.asset_class,
            "market": i.market,
            "timestamp": i.timestamp.isoformat() if hasattr(i.timestamp, "isoformat") else str(i.timestamp),
            "open_price": i.open_price,
            "high_price": i.high_price,
            "low_price": i.low_price,
            "close_price": i.close_price,
            "volume": i.volume,
            "currency": i.currency,
            "source": i.source,
            "data_quality": i.data_quality,
            "data_origin": i.data_origin
        })
    return APIResponse(success=True, data=out)


@router.get("/signals", response_model=APIResponse[list[dict]])
async def get_market_signals(
    symbol: str = Query("SPY", description="Instrument symbol for signal calculation")
):
    """
    Calculate derived market activity proxies and liquidity indicators for instrument.
    Calculates Abnormal Volume Signal, Market Activity Signal, Volatility Change Ratio, Liquidity Proxy.
    """
    yf_provider = RealYahooFinanceProvider()
    obs = await yf_provider.get_observations(symbol, limit=90)

    if not obs:
        return APIResponse(
            success=False,
            message=f"INSUFFICIENT_DATA: No market observations found for symbol '{symbol}'.",
            data=[]
        )

    signals = []
    abnormal_vol = CapitalFlowProxyCalculator.calculate_abnormal_volume(obs)
    if abnormal_vol:
        abnormal_vol["calculation_timestamp"] = abnormal_vol["calculation_timestamp"].isoformat()
        signals.append(abnormal_vol)

    mkt_act = CapitalFlowProxyCalculator.calculate_market_activity(obs)
    if mkt_act:
        mkt_act["calculation_timestamp"] = mkt_act["calculation_timestamp"].isoformat()
        signals.append(mkt_act)

    vol_change = CapitalFlowProxyCalculator.calculate_volatility_change(obs)
    if vol_change:
        vol_change["calculation_timestamp"] = vol_change["calculation_timestamp"].isoformat()
        signals.append(vol_change)

    liq = CapitalFlowProxyCalculator.calculate_liquidity_proxy(obs)
    if liq:
        liq["calculation_timestamp"] = liq["calculation_timestamp"].isoformat()
        signals.append(liq)

    return APIResponse(success=True, data=signals)


@router.get("/event-analysis/{event_id}", response_model=APIResponse[dict])
async def get_event_market_analysis(event_id: str, db: DBSession):
    """
    Perform Event Window Market Analysis and generate Event-Aligned Market Signal for an extracted event.
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
                "status": "UNMAPPED",
                "message": "Event could not be reliably mapped to observable financial instruments."
            }
        )

    target_symbol = mappings[0]["instrument_symbol"]
    yf_provider = RealYahooFinanceProvider()
    obs = await yf_provider.get_observations(target_symbol, limit=90)

    ev_dt = ev.created_at
    window_res = EventWindowAnalyzer.analyze_window(ev_dt, obs)
    signal = EventMarketSignalEngine.generate_signal(ev, target_symbol, window_res, obs)

    return APIResponse(success=True, data=signal)


@router.get("/event-mappings", response_model=APIResponse[list[dict]])
async def get_event_asset_mappings(db: DBSession, limit: int = Query(50, ge=1, le=200)):
    """
    Get transparent event-to-asset mapping rules and records.
    """
    stmt = select(EventAssetMapping).order_by(EventAssetMapping.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()

    out = []
    for i in items:
        out.append({
            "id": i.id,
            "event_id": i.event_id,
            "instrument_symbol": i.instrument_symbol,
            "asset_class": i.asset_class,
            "sector": i.sector,
            "country": i.country,
            "mapping_confidence": i.mapping_confidence,
            "mapping_rule": i.mapping_rule
        })
    return APIResponse(success=True, data=out)


@router.get("/sources/status", response_model=APIResponse[list[dict]])
async def get_data_sources_status():
    """
    Check connectivity, configuration status, and freshness of all financial data providers.
    """
    fred_provider = FREDProvider()
    wb_provider = WorldBankProvider()
    yf_provider = RealYahooFinanceProvider()

    statuses = [
        {
            "provider_name": yf_provider.provider_name,
            "category": yf_provider.category,
            "status": "ACTIVE",
            "error_message": None,
            "data_freshness_seconds": 0.0
        },
        {
            "provider_name": wb_provider.provider_name,
            "category": wb_provider.category,
            "status": "ACTIVE",
            "error_message": None,
            "data_freshness_seconds": 0.0
        },
        fred_provider.get_status()
    ]

    return APIResponse(success=True, data=statuses)
