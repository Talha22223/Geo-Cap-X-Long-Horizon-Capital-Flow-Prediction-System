"""
Capital-Flow Signal Fusion Engine (V6.2).
Combines Layer 1 (Event Signal), Layer 2 (Network Signal), Layer 3 (Market Signal), and Layer 4 (Data Quality)
into a transparent, structured Event-Market Intelligence Result with explicit conflict handling.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from models.event import ExtractedEvent

logger = logging.getLogger(__name__)


class SignalFusionEngine:
    """
    Transparent 4-Layer Signal Fusion Engine.
    Exposes Layer 1, Layer 2, Layer 3, Layer 4 separately in results.
    """

    @staticmethod
    def fuse_signals(
        event: ExtractedEvent,
        instrument_symbol: str,
        network_exposure_result: dict | None,
        market_observations: list[dict],
        window_analysis_result: dict,
        cross_asset_result: dict | None = None
    ) -> dict:
        """
        Synthesize fused Event-Market Intelligence Result across 4 separate layers.
        """
        # ── LAYER 1 — EVENT SIGNAL ────────────────────────────────────────────
        layer1 = {
            "event_id": event.id,
            "event_title": event.title,
            "event_category": event.category,
            "event_severity": round(event.severity, 4),
            "extraction_confidence": round(event.extraction_confidence, 4),
            "classification_confidence": round(event.classification_confidence, 4),
            "overall_confidence": round(event.overall_confidence, 4),
            "affected_countries": event.countries or [],
            "affected_regions": event.regions or [],
            "affected_sectors": event.sectors or [],
            "layer_score": round(event.overall_confidence * event.severity, 4)
        }

        # ── LAYER 2 — NETWORK SIGNAL ──────────────────────────────────────────
        net_exp_score = network_exposure_result.get("composite_exposure_score", 0.0) if network_exposure_result else 0.0
        top_paths = network_exposure_result.get("top_propagation_paths", []) if network_exposure_result else []
        community_summary = network_exposure_result.get("community_exposure", {}) if network_exposure_result else {}

        layer2 = {
            "network_exposure_score": round(net_exp_score, 4),
            "directly_exposed_count": len(network_exposure_result.get("directly_exposed_events", [])) if network_exposure_result else 0,
            "indirectly_exposed_count": len(network_exposure_result.get("indirectly_exposed_events", [])) if network_exposure_result else 0,
            "bridge_events_traversed": community_summary.get("bridge_events_traversed", []),
            "top_path_confidence": top_paths[0].get("path_confidence", 0.0) if top_paths else 0.0,
            "layer_score": round(net_exp_score, 4)
        }

        # ── LAYER 3 — MARKET SIGNAL ───────────────────────────────────────────
        z_score = window_analysis_result.get("abnormality_z_score")
        status_win = window_analysis_result.get("status")

        if status_win == "INSUFFICIENT_HISTORY" or z_score is None:
            market_signal_score = 0.0
            z_score_val = None
        else:
            z_score_val = round(z_score, 4)
            market_signal_score = round(min(1.0, abs(z_score) / 3.0), 4)

        latest_obs = market_observations[-1] if market_observations else {}

        layer3 = {
            "instrument_symbol": instrument_symbol,
            "asset_class": latest_obs.get("asset_class", "EQUITY"),
            "pre_event_baseline_mean": window_analysis_result.get("pre_event_baseline_mean"),
            "pre_event_baseline_std": window_analysis_result.get("pre_event_baseline_std"),
            "event_day_value": window_analysis_result.get("event_day_value"),
            "post_event_value": window_analysis_result.get("post_event_value"),
            "abnormal_z_score": z_score_val,
            "market_signal_score": market_signal_score,
            "layer_score": market_signal_score
        }

        # ── LAYER 4 — DATA QUALITY ────────────────────────────────────────────
        has_sufficient_history = len(market_observations) >= 10
        sources_list = list(set([o.get("source", "YAHOO_FINANCE") for o in market_observations])) if market_observations else ["YAHOO_FINANCE"]

        data_quality_score = 1.0 if has_sufficient_history and len(sources_list) >= 1 else 0.5

        layer4 = {
            "data_quality_score": data_quality_score,
            "historical_observation_count": len(market_observations),
            "independent_sources_count": len(sources_list),
            "supporting_sources": sources_list,
            "data_freshness_seconds": 0.0,
            "is_sufficient_history": has_sufficient_history
        }

        # ── DOCUMENTED WEIGHTED FUSION ────────────────────────────────────────
        # FusedScore = 0.35 * Layer1 + 0.35 * Layer2 + 0.30 * Layer3
        s1 = layer1["layer_score"]
        s2 = layer2["layer_score"]
        s3 = layer3["layer_score"]

        raw_fused = (0.35 * s1) + (0.35 * s2) + (0.30 * s3)
        fused_score = round(min(1.0, raw_fused * data_quality_score), 4)

        # ── CONFLICT DETECTION & INTERPRETATION STATUS ─────────────────────────
        if not has_sufficient_history:
          interpretation_status = "INSUFFICIENT_EVIDENCE"
        elif s1 >= 0.5 and s3 >= 0.5:
          interpretation_status = "ALIGNED_HIGH_CONFIDENCE"
        elif s1 >= 0.5 and s3 < 0.25:
          interpretation_status = "UNCONFIRMED_EVENT_SIGNAL"
        elif s1 < 0.3 and s3 >= 0.6:
          interpretation_status = "UNMAPPED_MARKET_ANOMALY"
        else:
          interpretation_status = "MIXED_EVIDENCE"

        return {
            "event_id": event.id,
            "instrument_symbol": instrument_symbol,
            "observation_window": "[-30_DAYS, +5_DAYS]",
            "layer1_event_signal": layer1,
            "layer2_network_signal": layer2,
            "layer3_market_signal": layer3,
            "layer4_data_quality": layer4,
            "fused_signal_score": fused_score,
            "interpretation_status": interpretation_status,
            "cross_asset_alignment_json": cross_asset_result,
            "methodology_version": "v6.2",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
