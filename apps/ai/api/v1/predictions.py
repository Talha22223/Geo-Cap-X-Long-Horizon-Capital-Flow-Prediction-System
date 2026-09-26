"""
REST API Router for Capital Flow Predictions and Explainability.
"""
from fastapi import APIRouter, Query, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from core.dependencies import DBSession
from core.exceptions import PredictionNotFoundException
from models.capital_flow import CapitalFlowPrediction, PredictionEvidence, AlternativeScenario
from schemas.common import APIResponse, PaginatedResponse
from schemas.capital_flow import PredictionOut, PredictReq, ExplanationReq, EvidenceOut
from workers.job_manager import JobLifecycleManager
from workers.tasks.predict_task import run_predict_task
from capital_flow.explainer import ExplainabilityService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/generate", response_model=APIResponse[dict], status_code=202)
async def generate_predictions(
    req: PredictReq,
    db: DBSession,
    bg_tasks: BackgroundTasks
):
    """
    Trigger capital flow prediction inference execution in background.
    """
    job = await JobLifecycleManager.create_job(db, "predict")
    bg_tasks.add_task(run_predict_task, job.id)

    return APIResponse(
        success=True,
        data={"job_id": job.id, "status": "PENDING", "horizon": req.horizon}
    )


@router.get("", response_model=APIResponse[PaginatedResponse[PredictionOut]])
async def list_predictions(
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=500),
    horizon: str | None = None,
    country: str | None = None,
):
    """
    Query list of predictions.
    """
    stmt = select(CapitalFlowPrediction).options(
        selectinload(CapitalFlowPrediction.evidence),
        selectinload(CapitalFlowPrediction.alternative_scenarios)
    )

    if horizon:
        stmt = stmt.where(CapitalFlowPrediction.time_horizon == horizon.upper())
    if country:
        stmt = stmt.where(CapitalFlowPrediction.affected_country == country)

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

    predictions_out = []
    for item in items:
        # Pydantic v2 validation structure
        pred_dict = {
            "id": item.id,
            "affected_country": item.affected_country,
            "affected_region": item.affected_region,
            "affected_sector": item.affected_sector,
            "affected_industry": item.affected_industry,
            "currency": item.currency,
            "asset_class": item.asset_class,
            "direction": item.direction,
            "estimated_rotation_usd_bn": item.estimated_rotation_usd_bn,
            "time_horizon": item.time_horizon,
            "confidence": {
                "extraction_confidence": item.extraction_confidence,
                "classification_confidence": item.classification_confidence,
                "prediction_confidence": item.prediction_confidence,
                "overall_confidence": item.overall_confidence
            },
            "risk_level": item.risk_level,
            "reasoning": item.reasoning,
            "historical_similarity": item.historical_similarity,
            "evidence": [EvidenceOut.model_validate(e) for e in item.evidence],
            "alternative_scenarios": item.alternative_scenarios,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        }
        predictions_out.append(PredictionOut.model_validate(pred_dict))

    return APIResponse(
        success=True,
        data=PaginatedResponse(
            items=predictions_out,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
    )


@router.get("/{id}", response_model=APIResponse[PredictionOut])
async def get_prediction(id: str, db: DBSession):
    """
    Get core prediction properties.
    """
    stmt = (
        select(CapitalFlowPrediction)
        .where(CapitalFlowPrediction.id == id)
        .options(
            selectinload(CapitalFlowPrediction.evidence),
            selectinload(CapitalFlowPrediction.alternative_scenarios)
        )
    )
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise PredictionNotFoundException(id)

    pred_dict = {
        "id": item.id,
        "affected_country": item.affected_country,
        "affected_region": item.affected_region,
        "affected_sector": item.affected_sector,
        "affected_industry": item.affected_industry,
        "currency": item.currency,
        "asset_class": item.asset_class,
        "direction": item.direction,
        "estimated_rotation_usd_bn": item.estimated_rotation_usd_bn,
        "time_horizon": item.time_horizon,
        "confidence": {
            "extraction_confidence": item.extraction_confidence,
            "classification_confidence": item.classification_confidence,
            "prediction_confidence": item.prediction_confidence,
            "overall_confidence": item.overall_confidence
        },
        "risk_level": item.risk_level,
        "reasoning": item.reasoning,
        "historical_similarity": item.historical_similarity,
        "evidence": [EvidenceOut.model_validate(e) for e in item.evidence],
        "alternative_scenarios": item.alternative_scenarios,
        "created_at": item.created_at,
        "updated_at": item.updated_at
    }
    return APIResponse(success=True, data=PredictionOut.model_validate(pred_dict))


@router.post("/explain", response_model=APIResponse[dict])
async def explain_prediction(req: ExplanationReq, db: DBSession):
    """
    Generate complete plain-English explainability analysis for a prediction.
    """
    stmt = (
        select(CapitalFlowPrediction)
        .where(CapitalFlowPrediction.id == req.prediction_id)
        .options(
            selectinload(CapitalFlowPrediction.evidence).selectinload(PredictionEvidence.prediction),
            selectinload(CapitalFlowPrediction.alternative_scenarios)
        )
    )
    res = await db.execute(stmt)
    pred = res.scalars().first()
    if not pred:
        raise PredictionNotFoundException(req.prediction_id)

    # Resolve event titles for evidence links
    evidence_events = []
    for ev in pred.evidence:
        # Load event title
        from models.event import ExtractedEvent
        stmt_title = select(ExtractedEvent).where(ExtractedEvent.id == ev.event_id)
        res_title = await db.execute(stmt_title)
        event_obj = res_title.scalars().first()
        evidence_events.append({
            "event_id": ev.event_id,
            "title": event_obj.title if event_obj else "Unknown Event",
            "source": "GeoCap-X Pipeline",
            "sentiment": event_obj.sentiment if event_obj else "NEUTRAL",
            "weight": ev.weight
        })

    # Prepare data for explainer
    confidence_breakdown = {
        "overall_confidence": pred.overall_confidence,
        "extraction_confidence": pred.extraction_confidence,
        "classification_confidence": pred.classification_confidence,
        "prediction_confidence": pred.prediction_confidence
    }

    scenarios = [
        {"label": s.label, "description": s.description, "probability": s.probability}
        for s in pred.alternative_scenarios
    ]

    explanation = ExplainabilityService.generate_explanation(
        affected_entity=pred.affected_country or pred.affected_sector or "Global Assets",
        direction=pred.direction,
        magnitude=pred.estimated_rotation_usd_bn,
        horizon=pred.time_horizon,
        reasoning=pred.reasoning,
        supporting_events=evidence_events,
        confidence_breakdown=confidence_breakdown,
        scenarios=scenarios
    )

    return APIResponse(success=True, data=explanation)
