"""
REST API Router for Heatmap visualization data.
"""
from fastapi import APIRouter
from sqlalchemy import select, func

from core.dependencies import DBSession
from models.capital_flow import CapitalFlowPrediction
from schemas.common import APIResponse

router = APIRouter(prefix="/heatmap", tags=["Visualization Data"])


@router.get("", response_model=APIResponse[list[dict]])
async def get_heatmap_data(db: DBSession):
    """
    Get aggregated matrix representation (country/region -> magnitude) to render a D3 Heatmap.
    """
    stmt = (
        select(
            CapitalFlowPrediction.affected_country,
            CapitalFlowPrediction.affected_sector,
            func.sum(CapitalFlowPrediction.estimated_rotation_usd_bn).label("total_usd_bn"),
            CapitalFlowPrediction.direction
        )
        .where(CapitalFlowPrediction.affected_country.isnot(None))
        .group_by(CapitalFlowPrediction.affected_country, CapitalFlowPrediction.affected_sector, CapitalFlowPrediction.direction)
    )
    res = await db.execute(stmt)
    rows = res.all()

    heatmap = []
    for r in rows:
        country = r[0]
        sector = r[1] or "Unclassified"
        val = float(r[2] or 0.0)
        direction = r[3]
        
        # Signed flow
        signed_val = val if direction == "INFLOW" else -val

        heatmap.append({
            "x": country,
            "y": sector,
            "value": round(signed_val, 2),
            "direction": direction
        })

    return APIResponse(success=True, data=heatmap)
