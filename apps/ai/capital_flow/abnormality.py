"""
Statistical Abnormality Detection Engine.
Calculates statistical abnormality metrics against historical baselines.
Strictly returns INSUFFICIENT_HISTORY if insufficient observations exist.
"""
from __future__ import annotations
import math
import numpy as np


class StatisticalAbnormalityDetector:
    """
    Statistically defensible abnormality detection.
    """

    @staticmethod
    def calculate_z_score(value: float, baseline_values: list[float]) -> dict:
        """
        Calculate Z-score, Percentile Rank, and Robust Z-score (MAD).
        """
        if len(baseline_values) < 10:
            return {
                "status": "INSUFFICIENT_HISTORY",
                "z_score": None,
                "percentile": None,
                "mad_z_score": None,
                "baseline_mean": None,
                "baseline_std": None,
                "sample_size": len(baseline_values)
            }

        arr = np.array(baseline_values, dtype=float)
        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))

        z_score = (value - mean_val) / std_val if std_val > 0 else 0.0

        # Percentile rank
        pct = float(np.sum(arr <= value) / len(arr) * 100.0)

        # Median Absolute Deviation (MAD) robust Z-score
        median_val = float(np.median(arr))
        mad = float(np.median(np.abs(arr - median_val)))
        mad_z_score = (value - median_val) / (1.4826 * mad) if mad > 0 else 0.0

        return {
            "status": "CALCULATED",
            "z_score": round(z_score, 4),
            "percentile": round(pct, 2),
            "mad_z_score": round(mad_z_score, 4),
            "baseline_mean": round(mean_val, 4),
            "baseline_std": round(std_val, 4),
            "sample_size": len(baseline_values)
        }
