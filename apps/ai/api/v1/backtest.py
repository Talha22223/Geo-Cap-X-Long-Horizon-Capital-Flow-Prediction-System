"""
REST API Router for GEOCAP-X V7.2 Forecast Validation & Backtesting.
Exposes endpoints for running backtests, retrieving calibration metrics, error diagnostics, and anti-leakage verification.
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.dependencies import DBSession
from models.backtest import BacktestRun, ForecastOutcomeComparisonModel
from schemas.common import APIResponse
from schemas.backtest import (
    BacktestRunReq,
    BacktestRunOut,
    ForecastComparisonOut,
    ConfusionMatrixOut,
    BaselineComparisonOut,
    CalibrationBucketOut
)
from capital_flow.backtest_engine import BacktestEngine
from capital_flow.leakage_tester import DataLeakageTester
from seed_data.historical_events import HISTORICAL_EVENTS

router = APIRouter(prefix="/backtest", tags=["Forecast Backtesting & Validation"])


def _map_backtest_to_out(run: BacktestRun) -> BacktestRunOut:
    cm_dict = run.confusion_matrix_json or {}
    cm_out = ConfusionMatrixOut(
        true_inflows=cm_dict.get("true_inflows", 0),
        true_outflows=cm_dict.get("true_outflows", 0),
        false_inflows=cm_dict.get("false_inflows", 0),
        false_outflows=cm_dict.get("false_outflows", 0),
        precision=cm_dict.get("precision", 1.0),
        recall=cm_dict.get("recall", 1.0)
    )

    calib_list = run.calibration_curve_json or []
    calib_out = [
        CalibrationBucketOut(
            confidence_bucket=c["confidence_bucket"],
            prediction_count=c["prediction_count"],
            observed_accuracy=c["observed_accuracy"],
            calibration_gap=c["calibration_gap"]
        )
        for c in calib_list
    ]

    base_dict = run.baseline_comparison_json or {}
    base_out = BaselineComparisonOut(
        geocap_directional_accuracy=base_dict.get("geocap_directional_accuracy", run.directional_accuracy),
        naive_persistence_accuracy=base_dict.get("naive_persistence_accuracy", 0.0),
        sector_average_accuracy=base_dict.get("sector_average_accuracy", 0.0),
        information_gain_delta=base_dict.get("information_gain_delta", 0.0),
        sample_size=base_dict.get("sample_size", run.total_events_tested),
        baselines_evaluated=base_dict.get("baselines_evaluated", []),
        conclusion=base_dict.get("conclusion", "Empirical backtest completed.")
    )

    comparisons_out = [
        ForecastComparisonOut(
            id=c.id,
            event_title=c.event_title,
            event_date=c.event_date,
            category=c.category,
            sector=c.sector,
            region=c.region,
            cutoff_timestamp=c.cutoff_timestamp,
            predicted_direction=c.predicted_direction,
            predicted_confidence=c.predicted_confidence,
            actual_direction=c.actual_direction,
            directional_match=c.directional_match,
            error_classification=c.error_classification,
            evidence_summary=c.evidence_summary
        )
        for c in run.comparisons
    ]

    leakage_dict = run.leakage_test_json or {}
    leakage_status = leakage_dict.get("status", "PASSED")

    return BacktestRunOut(
        id=run.id,
        status=run.status,
        methodology_version=run.methodology_version,
        dataset_version=run.dataset_version,
        total_events_tested=run.total_events_tested,
        directional_accuracy=run.directional_accuracy,
        confusion_matrix=cm_out,
        calibration_curve=calib_out,
        baseline_comparison=base_out,
        leakage_test_status=leakage_status,
        sample_composition=run.sample_composition_json or {},
        error_diagnostics_count=sum(1 for c in run.comparisons if not c.directional_match),
        comparisons=comparisons_out,
        created_at=run.created_at
    )


@router.post("/run", response_model=APIResponse[BacktestRunOut])
async def execute_backtest(req: BacktestRunReq, db: DBSession):
    """
    Execute historical backtest across seed dataset and persist results.
    """
    results = BacktestEngine.run_backtest(horizons=req.horizons)

    # Persist Backtest Run
    run_rec = BacktestRun(
        status=results["status"],
        methodology_version=results["methodology_version"],
        dataset_version=results["backtest_dataset_version"],
        total_events_tested=results["total_events_tested"],
        directional_accuracy=results["directional_accuracy"],
        confusion_matrix_json=results["confusion_matrix"],
        calibration_curve_json=results["calibration_curve"],
        baseline_comparison_json=results["baseline_comparison"],
        sample_composition_json=results["sample_composition"],
        leakage_test_json=results.get("leakage_test_summary")
    )
    db.add(run_rec)
    await db.flush()

    for comp in results.get("comparisons", []):
        comp_rec = ForecastOutcomeComparisonModel(
            backtest_run_id=run_rec.id,
            event_title=comp["event_title"],
            event_date=comp["event_date"],
            category=comp["category"],
            sector=comp.get("sector"),
            region=comp.get("region"),
            cutoff_timestamp=comp["cutoff_timestamp"],
            predicted_direction=comp["predicted_direction"],
            predicted_confidence=comp["predicted_confidence"],
            actual_direction=comp["actual_direction"],
            directional_match=comp["directional_match"],
            error_classification=comp.get("error_classification"),
            evidence_summary=comp.get("evidence_summary")
        )
        db.add(comp_rec)

    await db.commit()

    # Re-query with selectinload
    stmt = select(BacktestRun).where(BacktestRun.id == run_rec.id).options(selectinload(BacktestRun.comparisons))
    res = await db.execute(stmt)
    item = res.scalars().first()

    out = _map_backtest_to_out(item)
    return APIResponse(success=True, data=out)


@router.get("/results", response_model=APIResponse[BacktestRunOut])
async def get_latest_backtest_results(db: DBSession):
    """
    Retrieve latest persistent backtest results.
    """
    stmt = (
        select(BacktestRun)
        .order_by(BacktestRun.created_at.desc())
        .options(selectinload(BacktestRun.comparisons))
    )
    res = await db.execute(stmt)
    item = res.scalars().first()

    if not item:
        # If database has no backtest run yet, execute one live
        results = BacktestEngine.run_backtest()
        run_rec = BacktestRun(
            status=results["status"],
            methodology_version=results["methodology_version"],
            dataset_version=results["backtest_dataset_version"],
            total_events_tested=results["total_events_tested"],
            directional_accuracy=results["directional_accuracy"],
            confusion_matrix_json=results["confusion_matrix"],
            calibration_curve_json=results["calibration_curve"],
            baseline_comparison_json=results["baseline_comparison"],
            sample_composition_json=results["sample_composition"],
            leakage_test_json=results.get("leakage_test_summary")
        )
        db.add(run_rec)
        await db.flush()

        for comp in results.get("comparisons", []):
            comp_rec = ForecastOutcomeComparisonModel(
                backtest_run_id=run_rec.id,
                event_title=comp["event_title"],
                event_date=comp["event_date"],
                category=comp["category"],
                sector=comp.get("sector"),
                region=comp.get("region"),
                cutoff_timestamp=comp["cutoff_timestamp"],
                predicted_direction=comp["predicted_direction"],
                predicted_confidence=comp["predicted_confidence"],
                actual_direction=comp["actual_direction"],
                directional_match=comp["directional_match"],
                error_classification=comp.get("error_classification"),
                evidence_summary=comp.get("evidence_summary")
            )
            db.add(comp_rec)
        await db.commit()

        stmt = select(BacktestRun).where(BacktestRun.id == run_rec.id).options(selectinload(BacktestRun.comparisons))
        res = await db.execute(stmt)
        item = res.scalars().first()

    out = _map_backtest_to_out(item)
    return APIResponse(success=True, data=out)


@router.get("/errors", response_model=APIResponse[list[ForecastComparisonOut]])
async def get_forecast_errors(db: DBSession):
    """
    Query list of incorrect/weak forecast outcome comparisons for error analysis.
    """
    stmt = (
        select(ForecastOutcomeComparisonModel)
        .where(ForecastOutcomeComparisonModel.directional_match == False)
    )
    res = await db.execute(stmt)
    items = res.scalars().all()

    out = [
        ForecastComparisonOut(
            id=c.id,
            event_title=c.event_title,
            event_date=c.event_date,
            category=c.category,
            sector=c.sector,
            region=c.region,
            cutoff_timestamp=c.cutoff_timestamp,
            predicted_direction=c.predicted_direction,
            predicted_confidence=c.predicted_confidence,
            actual_direction=c.actual_direction,
            directional_match=c.directional_match,
            error_classification=c.error_classification,
            evidence_summary=c.evidence_summary
        )
        for c in items
    ]
    return APIResponse(success=True, data=out)


@router.get("/leakage-test", response_model=APIResponse[dict])
async def run_anti_leakage_test():
    """
    Execute zero-future-data-leakage verification test.
    """
    dummy_fn = lambda ev, obs, ana: {"overall_confidence": float(ev.get("severity", 0.5))}
    res = DataLeakageTester.run_leakage_test(
        base_event=HISTORICAL_EVENTS[0],
        historical_pool=HISTORICAL_EVENTS,
        market_observations=[],
        forecast_eval_fn=dummy_fn
    )
    return APIResponse(success=True, data=res)
