"""
Confidence Separation & Conflict Resolution Engine (V8.1 Engine).
Isolates 7 distinct confidence metrics and handles opposing/conflicting evidence cleanly.
Discontinues single monolithic "AI confidence" numbers without documented sub-factor breakdowns.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class SeparatedConfidenceBreakdown:
    """
    Explicit breakdown of 7 distinct confidence metrics.
    """
    extraction_confidence: float
    classification_confidence: float
    relationship_confidence: float
    graph_centrality_score: float
    market_baseline_quality: float
    market_signal_strength: float
    scenario_confidence: float
    fused_overall_score: float
    methodology: str = "7_FACTOR_WEIGHTED_FUSION_V8.1"


class ConflictResolver:
    """
    Detects and represents evidence conflicts (e.g. Bullish NLP sentiment vs Bearish market Z-score).
    """

    @classmethod
    def resolve_conflicts(
        cls,
        event_sentiment: str,
        event_confidence: float,
        market_z_score: float | None,
        network_exposure_score: float,
        historical_similarity_score: float,
        observation_count: int
    ) -> dict[str, Any]:
        """
        Evaluates evidence alignment and returns transparent conflict state and details.
        """
        conflicts: list[str] = []
        alignments: list[str] = []

        # 1. Market vs Event Conflict
        if market_z_score is not None:
            if event_sentiment == "BULLISH" and market_z_score < -1.0:
                conflicts.append(f"Event sentiment is BULLISH but market statistical Z-score is BEARISH ({market_z_score:.2f}).")
            elif event_sentiment == "BEARISH" and market_z_score > 1.0:
                conflicts.append(f"Event sentiment is BEARISH but market statistical Z-score is BULLISH ({market_z_score:.2f}).")
            elif abs(market_z_score) >= 1.5:
                alignments.append(f"Market statistical Z-score ({market_z_score:.2f}) confirms event directional impact.")

        # 2. Data Sufficiency Conflict
        if observation_count < 10:
            conflicts.append(f"Insufficient market observation history ({observation_count} records < 10 minimum).")

        # 3. Extraction Confidence Conflict
        if event_confidence < 0.65:
            conflicts.append(f"Low NLP feature extraction confidence ({event_confidence:.2f}).")

        # 4. Historical Support Conflict
        if historical_similarity_score < 0.45:
            conflicts.append("No historical analogues matched above 45% similarity threshold.")
        else:
            alignments.append(f"Historical analogue matching confirms setup ({historical_similarity_score*100:.1f}% similarity).")

        # Determine Interpretation Status
        if len(conflicts) == 0 and event_confidence >= 0.75:
            status = "ALIGNED_HIGH_CONFIDENCE"
        elif observation_count < 10 or event_confidence < 0.50:
            status = "INSUFFICIENT_EVIDENCE"
        elif len(conflicts) >= 1:
            status = "MIXED_EVIDENCE"
        else:
            status = "UNCONFIRMED_EVENT_SIGNAL"

        return {
            "interpretation_status": status,
            "has_conflicts": len(conflicts) > 0,
            "conflict_count": len(conflicts),
            "conflict_details": conflicts,
            "alignment_details": alignments,
            "summary": f"Evidence status '{status}' with {len(conflicts)} conflicting factors and {len(alignments)} supporting alignments."
        }
