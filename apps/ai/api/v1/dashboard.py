"""
REST API Router for Dashboard Summaries.
"""
from fastapi import APIRouter
from sqlalchemy import select, func, String

from core.dependencies import DBSession
from models.event import ExtractedEvent
from models.capital_flow import CapitalFlowPrediction
from models.sna import NetworkAnalysisResult
from schemas.common import APIResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard Summary"])


@router.get("/summary", response_model=APIResponse[dict])
async def get_dashboard_summary(db: DBSession):
    """
    Get aggregated dashboard summary KPIs (events count, predictions, inflows/outflows).
    """
    # Total events
    stmt_events = select(func.count(ExtractedEvent.id))
    res_events = await db.execute(stmt_events)
    total_events = res_events.scalar() or 0

    # Total predictions
    stmt_pred = select(func.count(CapitalFlowPrediction.id))
    res_pred = await db.execute(stmt_pred)
    total_predictions = res_pred.scalar() or 0

    # Sum inflows and outflows
    stmt_inflow = select(func.sum(CapitalFlowPrediction.estimated_rotation_usd_bn)).where(func.cast(CapitalFlowPrediction.direction, String) == "INFLOW")
    res_inflow = await db.execute(stmt_inflow)
    total_inflows = float(res_inflow.scalar() or 0.0)

    stmt_outflow = select(func.sum(CapitalFlowPrediction.estimated_rotation_usd_bn)).where(func.cast(CapitalFlowPrediction.direction, String) == "OUTFLOW")
    res_outflow = await db.execute(stmt_outflow)
    total_outflows = float(res_outflow.scalar() or 0.0)

    # Average network density
    stmt_density = select(func.avg(NetworkAnalysisResult.network_density))
    res_density = await db.execute(stmt_density)
    avg_density = float(res_density.scalar() or 0.0)

    return APIResponse(
        success=True,
        data={
            "total_events": total_events,
            "total_predictions": total_predictions,
            "total_inflows_usd_bn": round(total_inflows, 2),
            "total_outflows_usd_bn": round(total_outflows, 2),
            "net_flow_usd_bn": round(total_inflows - total_outflows, 2),
            "network_density": round(avg_density, 4)
        }
    )
