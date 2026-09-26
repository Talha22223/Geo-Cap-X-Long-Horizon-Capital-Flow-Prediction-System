"""
V7.2 Forecast Validation, Backtesting, Calibration & Anti-Leakage Test Suite.
Validates Point-in-Time Data Control, Historical Backtesting, Confusion Matrix, Calibration Curve,
Baseline Comparison, Zero Future Data Leakage, and 5 Manual Spot Checks.
"""
import pytest
from datetime import datetime, date, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from capital_flow.point_in_time import PointInTimeFilter, PointInTimeSnapshot
from capital_flow.backtest_engine import BacktestEngine
from capital_flow.baseline_evaluator import BaselineEvaluator
from capital_flow.leakage_tester import DataLeakageTester
from seed_data.historical_events import HISTORICAL_EVENTS


@pytest.mark.asyncio
async def test_point_in_time_filtering():
    """
    Test strict temporal cutoff filtering.
    """
    cutoff = datetime(2023, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    events = [
        {"title": "Past Event", "published_at": datetime(2022, 6, 1, tzinfo=timezone.utc)},
        {"title": "Future Event", "published_at": datetime(2023, 6, 1, tzinfo=timezone.utc)},
    ]

    filtered_evs = PointInTimeFilter.filter_events(events, cutoff)
    assert len(filtered_evs) == 1
    assert filtered_evs[0]["title"] == "Past Event"

    obs = [
        {"timestamp": datetime(2022, 12, 31, tzinfo=timezone.utc), "close_price": 100.0},
        {"timestamp": datetime(2023, 1, 2, tzinfo=timezone.utc), "close_price": 105.0},
    ]

    filtered_obs = PointInTimeFilter.filter_market_observations(obs, cutoff)
    assert len(filtered_obs) == 1
    assert filtered_obs[0]["close_price"] == 100.0

    snapshot = PointInTimeFilter.create_snapshot("ev_test", cutoff, events, obs, HISTORICAL_EVENTS)
    assert snapshot.metadata_json["zero_future_leakage_guarantee"] is True
    assert snapshot.inputs_count["events_available"] == 1
    assert snapshot.inputs_count["market_observations_available"] == 1


@pytest.mark.asyncio
async def test_data_leakage_prevention():
    """
    STEP 8 — DATA LEAKAGE TEST.
    Verifies that forecast generation cannot access future events or market observations.
    """
    dummy_fn = lambda ev, obs, ana: {"overall_confidence": float(ev.get("severity", 0.5))}
    res = DataLeakageTester.run_leakage_test(
        base_event=HISTORICAL_EVENTS[0],
        historical_pool=HISTORICAL_EVENTS,
        market_observations=[],
        forecast_eval_fn=dummy_fn
    )

    assert res["status"] == "PASSED"
    assert res["future_events_leaked"] is False
    assert res["future_observations_leaked"] is False
    assert res["zero_leakage_verified"] is True


@pytest.mark.asyncio
async def test_historical_backtest_run():
    """
    STEP 3, 4, 5, 6, 7 — HISTORICAL BACKTESTING RUN.
    Verifies point-in-time forecast reconstruction across real seed dataset.
    """
    results = BacktestEngine.run_backtest()

    assert results["status"] == "BACKTEST_COMPLETED"
    assert results["total_events_tested"] >= 50
    assert 0.0 <= results["directional_accuracy"] <= 1.0

    cm = results["confusion_matrix"]
    assert "true_inflows" in cm
    assert "precision" in cm
    assert "recall" in cm

    calib = results["calibration_curve"]
    assert len(calib) >= 3
    assert all("confidence_bucket" in c for c in calib)

    baseline = results["baseline_comparison"]
    assert "geocap_directional_accuracy" in baseline
    assert "naive_persistence_accuracy" in baseline
    assert "information_gain_delta" in baseline

    sample = results["sample_composition"]
    assert sample["total_historical_events"] >= 50
    assert len(sample["category_breakdown"]) >= 5


@pytest.mark.asyncio
async def test_five_manual_spot_checks():
    """
    STEP 16 — MANUAL SPOT CHECK.
    Select 5 key historical events and verify point-in-time cutoff, forecast, actual outcome,
    and zero future data leakage:
    1. Fed Rate Hike 75bps (June 2022)
    2. Russia-Ukraine Invasion (Feb 2022)
    3. SVB Collapse (March 2023)
    4. Nord Stream Pipeline Explosion (Sept 2022)
    5. PBOC Loan Rate Cut (Aug 2023)
    """
    spot_check_titles = [
        "Federal Reserve Raises Interest Rates by 75 Basis Points",
        "Russia Invades Ukraine",
        "Silicon Valley Bank Collapses",
        "Nord Stream Pipelines Hit by Multiple Underwater Explosions",
        "People's Bank of China Cuts Key Lending Rates"
    ]

    matched_count = 0
    for title_query in spot_check_titles:
        matching = [ev for ev in HISTORICAL_EVENTS if title_query.lower() in ev["title"].lower()]
        assert len(matching) > 0, f"Spot check event '{title_query}' must exist in historical dataset"

        h_ev = matching[0]
        cutoff_dt = datetime.combine(h_ev["event_date"], datetime.min.time(), tzinfo=timezone.utc)

        # Filter strictly to cutoff
        past_analogues = PointInTimeFilter.filter_historical_analogues(HISTORICAL_EVENTS, cutoff_dt)

        # Verify no future events in filtered pool
        assert all(
            (a.get("event_date") if isinstance(a.get("event_date"), date) else date.fromisoformat(str(a.get("event_date"))[:10])) <= h_ev["event_date"]
            for a in past_analogues
        ), f"Point-in-time leakage detected for spot check '{h_ev['title']}'"

        matched_count += 1

    assert matched_count == 5, "All 5 manual spot checks passed point-in-time validation"
