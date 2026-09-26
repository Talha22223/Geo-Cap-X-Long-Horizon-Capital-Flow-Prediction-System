"""
Reference Baseline Comparison Evaluator (V7.2 Engine).
Evaluates GEOCAP-X forecasting performance relative to simple reference baselines (Naive Persistence, Sector Average).
Refrains from producing arbitrary "winner" marketing rankings.
"""
from __future__ import annotations
import logging
from typing import Any

logger = logging.getLogger(__name__)


class BaselineEvaluator:
    """
    Evaluates reference baselines against GEOCAP-X empirical performance.
    """

    @classmethod
    def evaluate_baselines(
        cls,
        comparisons: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        Calculates comparative performance metrics across GEOCAP-X, Naive Persistence, and Sector Average.
        """
        if not comparisons:
            return {
                "geocap_accuracy": 0.0,
                "naive_persistence_accuracy": 0.0,
                "sector_average_accuracy": 0.0,
                "information_gain_delta": 0.0,
                "sample_size": 0,
                "disclaimer": "INSUFFICIENT_BACKTEST_SAMPLE"
            }

        valid_sample = [c for c in comparisons if c.get("actual_direction") in ["INFLOW", "OUTFLOW"]]
        total = len(valid_sample)

        if total == 0:
            return {
                "geocap_accuracy": 0.0,
                "naive_persistence_accuracy": 0.0,
                "sector_average_accuracy": 0.0,
                "information_gain_delta": 0.0,
                "sample_size": 0,
                "disclaimer": "NO_VALID_OUTCOMES_SUPPORTED"
            }

        geocap_correct = 0
        naive_correct = 0
        sector_correct = 0

        for item in valid_sample:
            actual = item.get("actual_direction")
            pred_geocap = item.get("predicted_direction")
            pre_trend = item.get("pre_event_market_trend", "INFLOW")
            sector_hist = item.get("historical_sector_direction", "INFLOW")

            if pred_geocap == actual:
                geocap_correct += 1
            if pre_trend == actual:
                naive_correct += 1
            if sector_hist == actual:
                sector_correct += 1

        geocap_acc = round(geocap_correct / total, 4)
        naive_acc = round(naive_correct / total, 4)
        sector_acc = round(sector_correct / total, 4)
        info_gain = round(geocap_acc - naive_acc, 4)

        return {
            "geocap_directional_accuracy": geocap_acc,
            "naive_persistence_accuracy": naive_acc,
            "sector_average_accuracy": sector_acc,
            "information_gain_delta": info_gain,
            "sample_size": total,
            "baselines_evaluated": [
                {
                    "name": "NAIVE_PERSISTENCE",
                    "accuracy": naive_acc,
                    "description": "Predicts post-event rotation follows 30-day pre-event market trend."
                },
                {
                    "name": "HISTORICAL_SECTOR_AVERAGE",
                    "accuracy": sector_acc,
                    "description": "Predicts post-event direction aligns with sector historical mean."
                }
            ],
            "conclusion": f"GEOCAP-X methodology demonstrates {info_gain:+.2%} information gain relative to Naive Persistence baseline."
        }
