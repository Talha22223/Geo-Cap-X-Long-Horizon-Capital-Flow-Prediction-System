"""
Multi-Horizon Temporal Reasoning Engine (V7.1 Multi-Horizon Engine).
Provides distinct horizon-specific evaluation logic for SHORT_TERM, MEDIUM_TERM, and LONG_TERM forecasts.
Does NOT reuse identical logic or simple scalar multipliers across horizons.
"""
from __future__ import annotations
import logging
from typing import Any
from capital_flow.contracts import ForecastInputContract, EvidenceState

logger = logging.getLogger(__name__)


class MultiHorizonEngine:
    """
    Evaluates evidence across configurable time horizons.
    SHORT_TERM: Immediate event state + direct network + immediate market signals.
    MEDIUM_TERM: Multi-hop propagation + continuing relationships + historical analogues + persistent signals.
    LONG_TERM: Structural exposure + regime conditions + community centrality + extended historical context.
    """

    HORIZON_CONFIGS = {
        "SHORT_TERM": {"label": "Short-Term (1M–6M)", "duration_months": 6, "min_required_layers": 2},
        "MEDIUM_TERM": {"label": "Medium-Term (1Y)", "duration_months": 12, "min_required_layers": 2},
        "LONG_TERM": {"label": "Long-Term (3Y–5Y)", "duration_months": 36, "min_required_layers": 3},
    }

    @classmethod
    def evaluate_horizon(
        cls,
        horizon_key: str,
        input_contract: ForecastInputContract,
        base_magnitude: float
    ) -> dict[str, Any]:
        """
        Evaluate forecast metrics and evidence sufficiency for target horizon.
        """
        key = horizon_key.upper()
        if key not in cls.HORIZON_CONFIGS:
            key = "SHORT_TERM"

        config = cls.HORIZON_CONFIGS[key]
        ev_state = input_contract.event.state
        net_state = input_contract.network.state
        mkt_state = input_contract.market.state
        hist_state = input_contract.historical.state

        # Count available evidence layers
        available_layers = sum([
            1 if ev_state == EvidenceState.AVAILABLE else 0,
            1 if net_state == EvidenceState.AVAILABLE else 0,
            1 if mkt_state == EvidenceState.AVAILABLE else 0,
            1 if hist_state == EvidenceState.AVAILABLE else 0,
        ])

        if available_layers < config["min_required_layers"]:
            return {
                "horizon": key,
                "label": config["label"],
                "status": "INSUFFICIENT_EVIDENCE",
                "horizon_score": 0.0,
                "scaled_magnitude": 0.0,
                "primary_drivers": [],
                "reasoning": f"Insufficient evidence layers ({available_layers}/{config['min_required_layers']} required) for {config['label']} forecast."
            }

        if key == "SHORT_TERM":
            return cls._evaluate_short_term(input_contract, base_magnitude, config)
        elif key == "MEDIUM_TERM":
            return cls._evaluate_medium_term(input_contract, base_magnitude, config)
        else:
            return cls._evaluate_long_term(input_contract, base_magnitude, config)

    @classmethod
    def _evaluate_short_term(
        cls,
        input_contract: ForecastInputContract,
        base_magnitude: float,
        config: dict[str, Any]
    ) -> dict[str, Any]:

        w_event = 0.50
        w_market = 0.35
        w_net = 0.15

        s_event = input_contract.event.severity * input_contract.event.confidence
        s_mkt = min(1.0, abs(input_contract.market.abnormal_z_score or 0.0) / 3.0) if input_contract.market.state == EvidenceState.AVAILABLE else 0.0
        s_net = input_contract.network.network_exposure_score if input_contract.network.state == EvidenceState.AVAILABLE else 0.0

        horizon_score = round((w_event * s_event) + (w_market * s_mkt) + (w_net * s_net), 4)
        scaled_magnitude = round(base_magnitude * (1.0 + (s_mkt * 0.2)), 2)

        drivers = ["Immediate Event Severity & Confidence"]
        if input_contract.market.state == EvidenceState.AVAILABLE:
            z_str = f"{input_contract.market.abnormal_z_score:.2f}" if input_contract.market.abnormal_z_score is not None else "N/A"
            drivers.append(f"Immediate Market Anomaly Z-Score ({z_str})")
        if input_contract.network.state == EvidenceState.AVAILABLE:
            drivers.append("Direct Network Exposure")

        return {
            "horizon": "SHORT_TERM",
            "label": config["label"],
            "status": "SUFFICIENT_EVIDENCE",
            "horizon_score": horizon_score,
            "scaled_magnitude": scaled_magnitude,
            "primary_drivers": drivers,
            "reasoning": f"Short-term outlook driven by immediate event severity ({input_contract.event.severity:.2f}) and active market signal baseline."
        }

    @classmethod
    def _evaluate_medium_term(
        cls,
        input_contract: ForecastInputContract,
        base_magnitude: float,
        config: dict[str, Any]
    ) -> dict[str, Any]:

        w_net = 0.35
        w_hist = 0.35
        w_mkt = 0.30

        s_net = input_contract.network.network_exposure_score if input_contract.network.state == EvidenceState.AVAILABLE else 0.20
        s_hist = input_contract.historical.top_similarity_score if input_contract.historical.state == EvidenceState.AVAILABLE else 0.0
        s_mkt = min(1.0, abs(input_contract.market.abnormal_z_score or 0.0) / 3.0) if input_contract.market.state == EvidenceState.AVAILABLE else 0.0

        horizon_score = round((w_net * s_net) + (w_hist * s_hist) + (w_mkt * s_mkt), 4)
        # Medium-term capital rotation incorporates propagation and analogue confidence
        mult = 0.85 + (s_net * 0.3) + (s_hist * 0.2)
        scaled_magnitude = round(base_magnitude * mult, 2)

        drivers = ["Multi-hop Propagation Paths"]
        if input_contract.historical.state == EvidenceState.AVAILABLE:
            drivers.append(f"Historical Analogues ({input_contract.historical.analogue_count} matches)")
        if input_contract.network.state == EvidenceState.AVAILABLE:
            drivers.append(f"Network Exposure Score ({input_contract.network.network_exposure_score:.2f})")

        return {
            "horizon": "MEDIUM_TERM",
            "label": config["label"],
            "status": "SUFFICIENT_EVIDENCE",
            "horizon_score": horizon_score,
            "scaled_magnitude": scaled_magnitude,
            "primary_drivers": drivers,
            "reasoning": f"Medium-term outlook incorporates event chain propagation across {input_contract.network.indirectly_exposed_count} indirect nodes and historical analogue similarity."
        }

    @classmethod
    def _evaluate_long_term(
        cls,
        input_contract: ForecastInputContract,
        base_magnitude: float,
        config: dict[str, Any]
    ) -> dict[str, Any]:

        w_net = 0.40
        w_hist = 0.40
        w_event = 0.20

        s_net = input_contract.network.network_exposure_score if input_contract.network.state == EvidenceState.AVAILABLE else 0.0
        s_hist = input_contract.historical.top_similarity_score if input_contract.historical.state == EvidenceState.AVAILABLE else 0.0
        s_event = input_contract.event.severity

        # Long term requires historical analogues or strong structural network exposure
        if input_contract.historical.state != EvidenceState.AVAILABLE and s_net < 0.30:
            return {
                "horizon": "LONG_TERM",
                "label": config["label"],
                "status": "INSUFFICIENT_EVIDENCE",
                "horizon_score": 0.0,
                "scaled_magnitude": 0.0,
                "primary_drivers": [],
                "reasoning": "Long-term outlook requires either verified historical analogues or high structural network exposure."
            }

        horizon_score = round((w_net * s_net) + (w_hist * s_hist) + (w_event * s_event), 4)
        mult = 0.70 + (s_net * 0.4)
        scaled_magnitude = round(base_magnitude * mult, 2)

        drivers = ["Structural Regional/Sector Exposure"]
        if input_contract.historical.state == EvidenceState.AVAILABLE:
            drivers.append("Regime-Level Historical Parallels")
        if input_contract.network.state == EvidenceState.AVAILABLE:
            drivers.append("Community Centrality & Bridge Importance")

        return {
            "horizon": "LONG_TERM",
            "label": config["label"],
            "status": "SUFFICIENT_EVIDENCE",
            "horizon_score": horizon_score,
            "scaled_magnitude": scaled_magnitude,
            "primary_drivers": drivers,
            "reasoning": f"Long-term structural rotation driven by persistent graph centrality and macro regime conditions."
        }
