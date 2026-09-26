"""
REST API Router for GEOCAP-X V8.1 Unified Explanation & Provenance.
Exposes endpoints answering the 10 trust questions for events, forecasts, market signals, and data freshness.
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from core.dependencies import DBSession
from schemas.common import APIResponse
from schemas.trust import ExplanationOut, DataFreshnessOut
from capital_flow.unified_explainer import UnifiedExplanationEngine
from capital_flow.provenance import DataFreshnessTracker
from datetime import datetime, timezone

router = APIRouter(prefix="/explain", tags=["Unified Explainability & Provenance"])


@router.get("/event/{event_id}", response_model=APIResponse[dict])
async def explain_event(event_id: str, db: DBSession):
    """
    Get 10-stage traceability chain and full evidence explanation for an ExtractedEvent.
    """
    engine = UnifiedExplanationEngine(db)
    res = await engine.explain_event(event_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return APIResponse(success=True, data=res)


@router.get("/forecast/{forecast_id}", response_model=APIResponse[dict])
async def explain_forecast(forecast_id: str, db: DBSession):
    """
    Get 10-stage traceability chain and full evidence explanation for a MultiHorizonForecast.
    """
    engine = UnifiedExplanationEngine(db)
    res = await engine.explain_forecast(forecast_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return APIResponse(success=True, data=res)


@router.get("/freshness", response_model=APIResponse[dict])
async def system_data_freshness_audit():
    """
    Run system-wide data freshness audit across data sources.
    """
    now = datetime.now(timezone.utc)
    audit = {
        "audit_timestamp": now.isoformat(),
        "data_sources": [
            DataFreshnessTracker.evaluate_freshness("MARKET_OBSERVATION", now, now),
            DataFreshnessTracker.evaluate_freshness("NEWS_EVENT", now, now),
            DataFreshnessTracker.evaluate_freshness("MACRO_ECONOMIC", now, now),
            DataFreshnessTracker.evaluate_freshness("GRAPH_SNA", now, now),
            DataFreshnessTracker.evaluate_freshness("FORECAST_SCENARIO", now, now),
        ]
    }
    return APIResponse(success=True, data=audit)
