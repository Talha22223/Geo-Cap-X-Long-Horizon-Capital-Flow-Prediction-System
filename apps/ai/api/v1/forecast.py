"""
REST API Router for GEOCAP-X V7.1 Multi-Horizon Scenario Forecasts.
Exposes endpoints for generating forecasts, retrieving horizon outlooks, scenario details, analogues, and methodology.
"""
from __future__ import annotations
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.dependencies import DBSession
from models.forecast import MultiHorizonForecast, ForecastScenarioModel, ForecastAnalogueModel
from schemas.common import APIResponse
from schemas.forecast import (
    ForecastGenerateReq,
    MultiHorizonForecastOut,
    ScenarioOut,
    AnalogueOut,
    MethodologyOut,
    SensitivityOut
)
from capital_flow.forecast_orchestrator import ForecastOrchestrator

router = APIRouter(prefix="/forecast", tags=["Multi-Horizon Forecasts"])


def _map_forecast_to_out(item: MultiHorizonForecast) -> MultiHorizonForecastOut:
    scenarios_out = [
        ScenarioOut(
            scenario_id=s.id,
            type=s.scenario_type,
            title=s.title,
            description=s.description,
            assumptions=s.assumptions_json or [],
            supporting_evidence=s.supporting_evidence_json or [],
            opposing_evidence=s.opposing_evidence_json or [],
            affected_sectors_assets=s.affected_sectors_assets_json or [],
            relevant_network_paths=s.relevant_network_paths_json or [],
            uncertainty=s.uncertainty,
            scenario_confidence=s.scenario_confidence
        )
        for s in item.scenarios
    ]

    analogues_out = [
        AnalogueOut(
            historical_event_title=a.historical_event_title,
            historical_date=a.historical_date,
            similarity_score=a.similarity_score,
            similarity_method=a.similarity_method,
            matching_attributes=a.matching_attributes_json or [],
            observed_outcome=a.observed_outcome,
            source=a.source
        )
        for a in item.analogues
    ]

    sens_dict = item.sensitivity_json
    sensitivity_out = SensitivityOut(
        baseline_confidence=sens_dict.get("baseline_confidence", item.overall_confidence) if sens_dict else item.overall_confidence,
        primary_sensitivity_driver=sens_dict.get("primary_sensitivity_driver", "EVENT_SEVERITY") if sens_dict else "EVENT_SEVERITY",
        sensitivity_breakdown=sens_dict.get("sensitivity_breakdown", []) if sens_dict else []
    ) if sens_dict else None

    return MultiHorizonForecastOut(
        id=item.id,
        event_id=item.event_id,
        horizon=item.horizon,
        status=item.status,
        confidence_state=item.confidence_state,
        overall_confidence=item.overall_confidence,
        estimated_rotation_usd_bn=item.estimated_rotation_usd_bn,
        affected_country=item.affected_country,
        affected_region=item.affected_region,
        affected_sector=item.affected_sector,
        asset_class=item.asset_class,
        primary_sensitivity_driver=item.primary_sensitivity_driver,
        methodology_version=item.methodology_version,
        data_snapshot=item.data_snapshot_json,
        sensitivity=sensitivity_out,
        scenarios=scenarios_out,
        analogues=analogues_out,
        created_at=item.created_at
    )


@router.post("/generate", response_model=APIResponse[list[MultiHorizonForecastOut]])
async def generate_forecast(req: ForecastGenerateReq, db: DBSession):
    """
    Generate or update multi-horizon scenario forecast for a target canonical event.
    """
    orchestrator = ForecastOrchestrator(db)
    forecasts = await orchestrator.generate_forecast_for_event(req.event_id, req.horizons)
    if not forecasts:
        raise HTTPException(status_code=404, detail=f"Event '{req.event_id}' not found or forecast failed.")

    out = [_map_forecast_to_out(f) for f in forecasts]
    return APIResponse(success=True, data=out)


@router.get("/event/{event_id}", response_model=APIResponse[list[MultiHorizonForecastOut]])
async def get_forecasts_by_event(event_id: str, db: DBSession):
    """
    Get all generated multi-horizon forecasts for a canonical event.
    """
    stmt = (
        select(MultiHorizonForecast)
        .where(MultiHorizonForecast.event_id == event_id)
        .options(
            selectinload(MultiHorizonForecast.scenarios),
            selectinload(MultiHorizonForecast.analogues)
        )
    )
    res = await db.execute(stmt)
    items = res.scalars().all()
    out = [_map_forecast_to_out(i) for i in items]
    return APIResponse(success=True, data=out)


@router.get("/by-horizon", response_model=APIResponse[list[MultiHorizonForecastOut]])
async def get_forecasts_by_horizon(
    db: DBSession,
    horizon: str = Query("SHORT_TERM", description="SHORT_TERM, MEDIUM_TERM, LONG_TERM")
):
    """
    Query forecasts filtered by horizon.
    """
    stmt = (
        select(MultiHorizonForecast)
        .where(MultiHorizonForecast.horizon == horizon.upper())
        .options(
            selectinload(MultiHorizonForecast.scenarios),
            selectinload(MultiHorizonForecast.analogues)
        )
    )
    res = await db.execute(stmt)
    items = res.scalars().all()
    out = [_map_forecast_to_out(i) for i in items]
    return APIResponse(success=True, data=out)


@router.get("/{forecast_id}/scenarios", response_model=APIResponse[list[ScenarioOut]])
async def get_forecast_scenarios(forecast_id: str, db: DBSession):
    """
    Get scenario details for a specific forecast.
    """
    stmt = select(ForecastScenarioModel).where(ForecastScenarioModel.forecast_id == forecast_id)
    res = await db.execute(stmt)
    items = res.scalars().all()
    out = [
        ScenarioOut(
            scenario_id=s.id,
            type=s.scenario_type,
            title=s.title,
            description=s.description,
            assumptions=s.assumptions_json or [],
            supporting_evidence=s.supporting_evidence_json or [],
            opposing_evidence=s.opposing_evidence_json or [],
            affected_sectors_assets=s.affected_sectors_assets_json or [],
            relevant_network_paths=s.relevant_network_paths_json or [],
            uncertainty=s.uncertainty,
            scenario_confidence=s.scenario_confidence
        )
        for s in items
    ]
    return APIResponse(success=True, data=out)


@router.get("/{forecast_id}/analogues", response_model=APIResponse[list[AnalogueOut]])
async def get_forecast_analogues(forecast_id: str, db: DBSession):
    """
    Get matched historical analogues for a specific forecast.
    """
    stmt = select(ForecastAnalogueModel).where(ForecastAnalogueModel.forecast_id == forecast_id)
    res = await db.execute(stmt)
    items = res.scalars().all()
    out = [
        AnalogueOut(
            historical_event_title=a.historical_event_title,
            historical_date=a.historical_date,
            similarity_score=a.similarity_score,
            similarity_method=a.similarity_method,
            matching_attributes=a.matching_attributes_json or [],
            observed_outcome=a.observed_outcome,
            source=a.source
        )
        for a in items
    ]
    return APIResponse(success=True, data=out)


@router.get("/methodology", response_model=APIResponse[MethodologyOut])
async def get_forecast_methodology():
    """
    Get current forecasting engine methodology version and evidence parameters.
    """
    return APIResponse(success=True, data=MethodologyOut())
