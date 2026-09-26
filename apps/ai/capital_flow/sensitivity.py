"""
Sensitivity Analysis Engine (V7.1 Multi-Horizon Engine).
Calculates sensitivity of scenario confidence to layer perturbations (Network, Market, Historical).
"""
from __future__ import annotations
import logging
from typing import Any
from capital_flow.contracts import ForecastInputContract, EvidenceState

logger = logging.getLogger(__name__)


class SensitivityAnalyzer:
    """
    Determines which input evidence layers materially affect forecast scenario confidence.
    Executes controlled perturbations and measures confidence delta.
    """

    @classmethod
    def calculate_sensitivity(
        cls,
        input_contract: ForecastInputContract,
        baseline_confidence: float,
        eval_fn: Any
    ) -> dict[str, Any]:
        """
        Calculates sensitivity shifts across Network Exposure, Market Evidence, and Historical Analogues.
        """
        results: list[dict[str, Any]] = []

        # 1. Market Evidence Sensitivity
        if input_contract.market.state == EvidenceState.AVAILABLE:
            conf_without_market = eval_fn(
                input_contract,
                override_market_state=EvidenceState.UNAVAILABLE
            )
            delta_mkt = round(baseline_confidence - conf_without_market, 4)
            results.append({
                "factor": "MARKET_EVIDENCE",
                "confidence_delta": delta_mkt,
                "impact_level": cls._classify_impact(abs(delta_mkt)),
                "description": f"Removing market observation baseline causes a confidence shift of {delta_mkt:+.2f}."
            })
        else:
            results.append({
                "factor": "MARKET_EVIDENCE",
                "confidence_delta": 0.0,
                "impact_level": "LOW",
                "description": "Market observations unavailable; zero impact on active forecast."
            })

        # 2. Network Exposure Sensitivity
        if input_contract.network.state == EvidenceState.AVAILABLE:
            conf_low_net = eval_fn(
                input_contract,
                override_network_score=max(0.0, input_contract.network.network_exposure_score * 0.5)
            )
            delta_net = round(baseline_confidence - conf_low_net, 4)
            results.append({
                "factor": "NETWORK_EXPOSURE",
                "confidence_delta": delta_net,
                "impact_level": cls._classify_impact(abs(delta_net)),
                "description": f"Reducing network exposure score by 50% alters scenario confidence by {delta_net:+.2f}."
            })
        else:
            results.append({
                "factor": "NETWORK_EXPOSURE",
                "confidence_delta": 0.0,
                "impact_level": "LOW",
                "description": "Network graph exposure unmapped; zero sensitivity delta."
            })

        # 3. Historical Analogue Sensitivity
        if input_contract.historical.state == EvidenceState.AVAILABLE:
            conf_without_hist = eval_fn(
                input_contract,
                override_historical_state=EvidenceState.UNAVAILABLE
            )
            delta_hist = round(baseline_confidence - conf_without_hist, 4)
            results.append({
                "factor": "HISTORICAL_ANALOGUES",
                "confidence_delta": delta_hist,
                "impact_level": cls._classify_impact(abs(delta_hist)),
                "description": f"Excluding historical event analogues shifts confidence by {delta_hist:+.2f}."
            })
        else:
            results.append({
                "factor": "HISTORICAL_ANALOGUES",
                "confidence_delta": 0.0,
                "impact_level": "LOW",
                "description": "Historical analogues insufficient; baseline un-impacted."
            })

        # Identify primary sensitivity driver
        results.sort(key=lambda x: abs(x["confidence_delta"]), reverse=True)
        primary_driver = results[0]["factor"] if results and abs(results[0]["confidence_delta"]) > 0.0 else "EVENT_SEVERITY"

        return {
            "baseline_confidence": round(baseline_confidence, 4),
            "primary_sensitivity_driver": primary_driver,
            "sensitivity_breakdown": results
        }

    @staticmethod
    def _classify_impact(abs_delta: float) -> str:
        if abs_delta >= 0.15:
            return "HIGH"
        elif abs_delta >= 0.05:
            return "MEDIUM"
        else:
            return "LOW"
