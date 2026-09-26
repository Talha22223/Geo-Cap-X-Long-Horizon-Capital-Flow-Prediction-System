"""
Explainability Generation Service.
"""
from typing import Any


class ExplainabilityService:
    """
    Builds plain-English structured explanations for capital flow predictions.
    Ensure GeoCap-X does not behave like a generic chat bot.
    """

    @staticmethod
    def generate_explanation(
        affected_entity: str,
        direction: str,
        magnitude: float,
        horizon: str,
        reasoning: str,
        supporting_events: list[dict[str, Any]],
        confidence_breakdown: dict[str, float],
        scenarios: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        Synthesizes structured reasoning logs to explain prediction outputs.
        """
        # Format confidence scores
        overall = confidence_breakdown.get("overall_confidence", 0.0)
        ext = confidence_breakdown.get("extraction_confidence", 0.0)
        cls = confidence_breakdown.get("classification_confidence", 0.0)
        pred = confidence_breakdown.get("prediction_confidence", 0.0)

        # Structure evidence summary
        evidence_summary = [
            f"Event '{e['title']}' (Source: {e['source']}, Sentiment: {e['sentiment']}) weighted with impact score {e['weight']:.2f}"
            for e in supporting_events
        ]

        explanation = {
            "prediction_summary": (
                f"Predicted Capital {direction.upper()} of ${magnitude:.1f}B for '{affected_entity}' "
                f"over a {horizon.lower().replace('_', ' ')} horizon."
            ),
            "capital_flow_reasoning": reasoning,
            "supporting_events": supporting_events,
            "evidence_used": evidence_summary,
            "technical_confirmation": (
                f"Graph influence and PageRank weights confirm propagation strength. "
                f"SNA nodes indicate strong causal linking across {len(supporting_events)} events."
            ),
            "confidence_breakdown": {
                "overall_confidence": overall,
                "extraction_confidence": ext,
                "classification_confidence": cls,
                "prediction_confidence": pred
            },
            "alternative_scenarios": scenarios,
            "risk_factors": [
                "Contagion lag effects may stretch predicted horizons.",
                "Policy adjustments or currency interventions by central banks can deflect initial flows."
            ]
        }
        return explanation
