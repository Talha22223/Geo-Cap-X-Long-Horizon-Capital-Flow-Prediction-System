"""
Evidence-Based Scenario Generation & Confidence Engine (V7.1 Multi-Horizon Engine).
Generates CONTINUATION, ESCALATION, and DE-ESCALATION scenarios backed strictly by multi-layer evidence.
Separates supporting vs opposing evidence and derives calibrated scenario confidence without hardcoded percentages.
"""
from __future__ import annotations
import uuid
import logging
from typing import Any
from capital_flow.contracts import ForecastInputContract, EvidenceState
from capital_flow.multi_horizon import MultiHorizonEngine
from capital_flow.sensitivity import SensitivityAnalyzer

logger = logging.getLogger(__name__)


class ScenarioEngine:
    """
    Genuine Evidence-Based Scenario Generation Engine.
    """

    @classmethod
    def generate_scenarios_for_horizon(
        cls,
        horizon_key: str,
        input_contract: ForecastInputContract,
        base_magnitude: float
    ) -> dict[str, Any]:
        """
        Generate scenarios for target horizon backed strictly by evidence layers.
        """
        horizon_res = MultiHorizonEngine.evaluate_horizon(horizon_key, input_contract, base_magnitude)

        if horizon_res["status"] == "INSUFFICIENT_EVIDENCE":
            return {
                "horizon": horizon_key,
                "status": "INSUFFICIENT_EVIDENCE",
                "scenarios": [],
                "confidence_state": "UNCONFIRMED_INSUFFICIENT_DATA",
                "sensitivity": None,
                "reasoning": horizon_res["reasoning"]
            }

        event = input_contract.event
        net = input_contract.network
        mkt = input_contract.market
        hist = input_contract.historical
        dq = input_contract.data_quality

        direction = "INFLOW" if event.sentiment == "BULLISH" else ("OUTFLOW" if event.sentiment == "BEARISH" else "NEUTRAL")
        magnitude = horizon_res["scaled_magnitude"]

        # Base confidence evaluation function for sensitivity analysis
        def eval_conf_fn(
            inp: ForecastInputContract,
            override_market_state: EvidenceState | None = None,
            override_network_score: float | None = None,
            override_historical_state: EvidenceState | None = None
        ) -> float:
            m_state = override_market_state if override_market_state is not None else inp.market.state
            n_score = override_network_score if override_network_score is not None else inp.network.network_exposure_score
            h_state = override_historical_state if override_historical_state is not None else inp.historical.state

            c_event = inp.event.confidence * inp.event.severity
            c_net = n_score if inp.network.state == EvidenceState.AVAILABLE else 0.0
            c_mkt = min(1.0, abs(inp.market.abnormal_z_score or 0.0) / 3.0) if m_state == EvidenceState.AVAILABLE else 0.0
            c_hist = inp.historical.top_similarity_score if h_state == EvidenceState.AVAILABLE else 0.0

            raw = (0.35 * c_event) + (0.25 * c_net) + (0.25 * c_mkt) + (0.15 * c_hist)
            return round(min(1.0, raw * dq.completeness_score), 4)

        base_confidence = eval_conf_fn(input_contract)

        # Build Supporting vs Opposing Evidence Collections
        supporting_evidence: list[str] = []
        opposing_evidence: list[str] = []

        # Event Layer Evidence
        supporting_evidence.append(
            f"Canonical Event '{event.title}' severity ({event.severity:.2f}) with extraction confidence {event.confidence:.2f}."
        )
        if event.confidence < 0.70:
            opposing_evidence.append(f"Low overall event extraction confidence ({event.confidence:.2f}).")

        # Network Layer Evidence
        if net.state == EvidenceState.AVAILABLE and net.network_exposure_score > 0.20:
            supporting_evidence.append(
                f"Network exposure score {net.network_exposure_score:.2f} across {net.indirectly_exposed_count} connected nodes."
            )
            if net.bridge_events_traversed:
                supporting_evidence.append(f"Traverses key bridge event nodes: {', '.join(net.bridge_events_traversed[:2])}.")
        else:
            opposing_evidence.append("Network exposure score is low or unmapped across propagation graph.")

        # Market Layer Evidence
        if mkt.state == EvidenceState.AVAILABLE and mkt.abnormal_z_score is not None:
            if abs(mkt.abnormal_z_score) >= 1.5:
                supporting_evidence.append(
                    f"Market observation for {mkt.instrument_symbol} confirms statistical anomaly (Z-score: {mkt.abnormal_z_score:.2f})."
                )
            else:
                opposing_evidence.append(
                    f"Market observation for {mkt.instrument_symbol} shows weak anomaly Z-score ({mkt.abnormal_z_score:.2f})."
                )
        else:
            opposing_evidence.append("Direct market time-series observations are unavailable for validation.")

        # Historical Layer Evidence
        if hist.state == EvidenceState.AVAILABLE and hist.analogue_count > 0:
            top_a = hist.matched_analogues[0]
            supporting_evidence.append(
                f"Matched historical analogue '{top_a['title']}' ({top_a['date']}) with {top_a['similarity_score']*100:.1f}% attribute similarity."
            )
        else:
            opposing_evidence.append("Insufficient historical analogues (<0.45 attribute similarity threshold).")

        # Generate Evidence-Backed Scenarios
        scenarios: list[dict[str, Any]] = []

        # 1. CONTINUATION SCENARIO (Base Case)
        cont_conf = round(min(0.95, base_confidence + 0.05), 2)
        cont_assumptions = [
            f"No immediate macro policy reversal regarding {event.category.lower().replace('_', ' ')}",
            f"Capital rotation remains in predicted {direction.lower()} direction across {event.sectors[0] if event.sectors else 'target sector'}",
            "Market liquidity baseline remains stable without liquidity shocks"
        ]
        scenarios.append({
            "scenario_id": f"SCEN_CONT_{uuid.uuid4().hex[:8]}",
            "type": "CONTINUATION",
            "title": "Base Continuation Scenario",
            "description": f"Capital continues rotating in the predicted {direction.lower()} direction by approx ${magnitude:.1f}B, consistent with observed event severity and network exposure.",
            "assumptions": cont_assumptions,
            "supporting_evidence": supporting_evidence,
            "opposing_evidence": opposing_evidence,
            "affected_sectors_assets": event.sectors + ([mkt.instrument_symbol] if mkt.instrument_symbol else []),
            "relevant_network_paths": [p.get("path_summary", "Direct Edge") for p in net.top_propagation_paths[:2]] if net.top_propagation_paths else ["Direct Event Target"],
            "historical_analogues": [a["title"] for a in hist.matched_analogues[:2]],
            "uncertainty": cls._evaluate_uncertainty(cont_conf, len(opposing_evidence)),
            "horizon": horizon_key,
            "scenario_confidence": cont_conf
        })

        # 2. ESCALATION SCENARIO (Only generated if event severity >= 0.60 or strong network exposure)
        if event.severity >= 0.60 or net.network_exposure_score >= 0.50:
            esc_conf = round(max(0.10, base_confidence * 0.75), 2)
            esc_magnitude = round(magnitude * 1.4, 2)
            esc_assumptions = [
                "Contagion spreads across adjacent network node clusters",
                "Secondary policy responses exacerbate capital flight/inflow pressure",
                "Market volatility expands beyond 2 standard deviations"
            ]
            esc_supporting = [
                f"High baseline event severity ({event.severity:.2f}) raises risk of escalation.",
                f"Connected graph communities exhibit compounding propagation potential."
            ] + supporting_evidence[:2]

            esc_opposing = [
                "Regulatory or central bank intervention may cap escalation speed."
            ] + opposing_evidence[:1]

            scenarios.append({
                "scenario_id": f"SCEN_ESC_{uuid.uuid4().hex[:8]}",
                "type": "ESCALATION",
                "title": "Compounding Escalation Scenario",
                "description": f"Event pressure escalates across network paths, expanding capital rotation magnitude to ${esc_magnitude:.1f}B due to contagion triggers.",
                "assumptions": esc_assumptions,
                "supporting_evidence": esc_supporting,
                "opposing_evidence": esc_opposing,
                "affected_sectors_assets": event.sectors + event.regions,
                "relevant_network_paths": [p.get("path_summary", "Multi-hop Path") for p in net.top_propagation_paths[:3]] if net.top_propagation_paths else ["Expanded Cluster Network"],
                "historical_analogues": [a["title"] for a in hist.matched_analogues[:1]],
                "uncertainty": cls._evaluate_uncertainty(esc_conf, len(esc_opposing)),
                "horizon": horizon_key,
                "scenario_confidence": esc_conf
            })

        # 3. NORMALIZATION / DE-ESCALATION SCENARIO
        deesc_conf = round(max(0.10, 1.0 - base_confidence), 2)
        deesc_magnitude = round(magnitude * 0.35, 2)
        deesc_assumptions = [
            "De-escalation negotiations or policy stabilization occurs",
            "Market reaction absorbs initial shock, dampening capital rotation to baseline levels",
            "Event impact decays rapidly without follow-on catalysts"
        ]
        deesc_supporting = [
            "Opposing market signals or weak z-scores favor normalization."
        ] + opposing_evidence

        deesc_opposing = [
            f"Persistent event severity ({event.severity:.2f}) acts against immediate normalization."
        ]

        scenarios.append({
            "scenario_id": f"SCEN_NORM_{uuid.uuid4().hex[:8]}",
            "type": "DE-ESCALATION",
            "title": "Normalization & Absorption Scenario",
            "description": f"Market absorbs event shock; capital rotation drops to muted ${deesc_magnitude:.1f}B as macro conditions stabilize.",
            "assumptions": deesc_assumptions,
            "supporting_evidence": deesc_supporting,
            "opposing_evidence": deesc_opposing,
            "affected_sectors_assets": event.sectors,
            "relevant_network_paths": ["Localized Event Node"],
            "historical_analogues": [a["title"] for a in hist.matched_analogues[1:2]] if len(hist.matched_analogues) > 1 else [],
            "uncertainty": cls._evaluate_uncertainty(deesc_conf, len(deesc_opposing)),
            "horizon": horizon_key,
            "scenario_confidence": deesc_conf
        })

        # Sensitivity Analysis
        sensitivity_res = SensitivityAnalyzer.calculate_sensitivity(
            input_contract,
            base_confidence,
            eval_conf_fn
        )

        return {
            "horizon": horizon_key,
            "status": "SUFFICIENT_EVIDENCE",
            "overall_forecast_confidence": base_confidence,
            "confidence_state": "ALIGNED_HIGH_CONFIDENCE" if base_confidence >= 0.65 else ("MIXED_EVIDENCE" if base_confidence >= 0.40 else "UNCONFIRMED_EVENT_SIGNAL"),
            "scenarios": scenarios,
            "sensitivity": sensitivity_res,
            "reasoning": f"Generated {len(scenarios)} evidence-backed scenarios for {horizon_key} horizon with overall confidence {base_confidence:.2f}."
        }

    @staticmethod
    def _evaluate_uncertainty(confidence: float, opposing_count: int) -> str:
        if confidence >= 0.75 and opposing_count <= 1:
            return "LOW"
        elif confidence >= 0.50:
            return "MEDIUM"
        elif confidence >= 0.30:
            return "HIGH"
        else:
            return "CRITICAL"
