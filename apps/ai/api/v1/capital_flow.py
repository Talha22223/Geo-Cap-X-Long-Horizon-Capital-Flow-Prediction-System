"""
REST API Router for Capital Flow aggregations.
"""
from fastapi import APIRouter
from sqlalchemy import select, func

from core.dependencies import DBSession
from models.capital_flow import CapitalFlowPrediction
from schemas.common import APIResponse

router = APIRouter(prefix="/capital-flow", tags=["Capital Flow Metrics"])


@router.get("", response_model=APIResponse[list[dict]])
async def get_raw_flow_predictions(db: DBSession):
    """
    Get all inferred predictions.
    """
    stmt = select(CapitalFlowPrediction)
    res = await db.execute(stmt)
    items = res.scalars().all()
    
    out = []
    for i in items:
        out.append({
            "id": i.id,
            "country": i.affected_country,
            "region": i.affected_region,
            "sector": i.affected_sector,
            "currency": i.currency,
            "direction": i.direction,
            "usd_bn": i.estimated_rotation_usd_bn,
            "horizon": i.time_horizon,
            "overall_confidence": i.overall_confidence
        })
    return APIResponse(success=True, data=out)


@router.get("/by-country", response_model=APIResponse[list[dict]])
async def get_flow_by_country(db: DBSession):
    """
    Aggregate net capital flow metrics grouped by country.
    """
    stmt = (
        select(
            CapitalFlowPrediction.affected_country,
            CapitalFlowPrediction.direction,
            func.sum(CapitalFlowPrediction.estimated_rotation_usd_bn).label("total_usd_bn")
        )
        .where(CapitalFlowPrediction.affected_country.isnot(None))
        .group_by(CapitalFlowPrediction.affected_country, CapitalFlowPrediction.direction)
    )
    res = await db.execute(stmt)
    rows = res.all()

    # Consolidate into net scores
    aggregates: dict[str, dict] = {}
    for r in rows:
        country = r[0]
        direction = r[1]
        val = float(r[2] or 0.0)

        data = aggregates.setdefault(country, {"country": country, "inflows": 0.0, "outflows": 0.0, "net": 0.0})
        if direction == "INFLOW":
            data["inflows"] = round(val, 2)
        elif direction == "OUTFLOW":
            data["outflows"] = round(val, 2)
        
        data["net"] = round(data["inflows"] - data["outflows"], 2)

    return APIResponse(success=True, data=list(aggregates.values()))


@router.get("/by-region", response_model=APIResponse[list[dict]])
async def get_flow_by_region(db: DBSession):
    """
    Aggregate net capital flow metrics grouped by region.
    """
    stmt = (
        select(
            CapitalFlowPrediction.affected_region,
            CapitalFlowPrediction.direction,
            func.sum(CapitalFlowPrediction.estimated_rotation_usd_bn).label("total_usd_bn")
        )
        .where(CapitalFlowPrediction.affected_region.isnot(None))
        .group_by(CapitalFlowPrediction.affected_region, CapitalFlowPrediction.direction)
    )
    res = await db.execute(stmt)
    rows = res.all()

    aggregates: dict[str, dict] = {}
    for r in rows:
        region = r[0]
        direction = r[1]
        val = float(r[2] or 0.0)

        data = aggregates.setdefault(region, {"region": region, "inflows": 0.0, "outflows": 0.0, "net": 0.0})
        if direction == "INFLOW":
            data["inflows"] = round(val, 2)
        elif direction == "OUTFLOW":
            data["outflows"] = round(val, 2)
        
        data["net"] = round(data["inflows"] - data["outflows"], 2)

    return APIResponse(success=True, data=list(aggregates.values()))


@router.get("/by-sector", response_model=APIResponse[list[dict]])
async def get_flow_by_sector(db: DBSession):
    """
    Aggregate net capital flow metrics grouped by sector.
    """
    stmt = (
        select(
            CapitalFlowPrediction.affected_sector,
            CapitalFlowPrediction.direction,
            func.sum(CapitalFlowPrediction.estimated_rotation_usd_bn).label("total_usd_bn")
        )
        .where(CapitalFlowPrediction.affected_sector.isnot(None))
        .group_by(CapitalFlowPrediction.affected_sector, CapitalFlowPrediction.direction)
    )
    res = await db.execute(stmt)
    rows = res.all()

    aggregates: dict[str, dict] = {}
    for r in rows:
        sector = r[0]
        direction = r[1]
        val = float(r[2] or 0.0)

        data = aggregates.setdefault(sector, {"sector": sector, "inflows": 0.0, "outflows": 0.0, "net": 0.0})
        if direction == "INFLOW":
            data["inflows"] = round(val, 2)
        elif direction == "OUTFLOW":
            data["outflows"] = round(val, 2)
        
        data["net"] = round(data["inflows"] - data["outflows"], 2)

    return APIResponse(success=True, data=list(aggregates.values()))


@router.get("/by-asset-class", response_model=APIResponse[list[dict]])
async def get_flow_by_asset_class(db: DBSession):
    """
    Aggregate net capital flow metrics grouped by asset class.
    """
    stmt = (
        select(
            CapitalFlowPrediction.asset_class,
            CapitalFlowPrediction.direction,
            func.sum(CapitalFlowPrediction.estimated_rotation_usd_bn).label("total_usd_bn")
        )
        .where(CapitalFlowPrediction.asset_class.isnot(None))
        .group_by(CapitalFlowPrediction.asset_class, CapitalFlowPrediction.direction)
    )
    res = await db.execute(stmt)
    rows = res.all()

    aggregates: dict[str, dict] = {}
    for r in rows:
        asset_class = r[0]
        direction = r[1]
        val = float(r[2] or 0.0)

        data = aggregates.setdefault(asset_class, {"asset_class": asset_class, "inflows": 0.0, "outflows": 0.0, "net": 0.0})
        if direction == "INFLOW":
            data["inflows"] = round(val, 2)
        elif direction == "OUTFLOW":
            data["outflows"] = round(val, 2)
        
        data["net"] = round(data["inflows"] - data["outflows"], 2)

    return APIResponse(success=True, data=list(aggregates.values()))
