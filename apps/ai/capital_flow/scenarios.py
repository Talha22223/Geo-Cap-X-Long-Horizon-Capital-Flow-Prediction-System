"""
Alternative Scenario Generation Engine.
"""
from typing import Any


class ScenarioGenerator:
    """
    Computes alternate probability-weighted scenarios for capital rotation predictions.
    """

    @staticmethod
    def generate(
        direction: str,
        magnitude: float,
        overall_confidence: float
    ) -> list[dict[str, Any]]:
        """
        Derives probability distribution and profiles for Bull, Bear, and Base cases.
        """
        # Distribute base probabilities based on prediction confidence
        base_prob = round(0.40 + (overall_confidence * 0.20), 2)
        bull_prob = round((1.0 - base_prob) * 0.60, 2)
        bear_prob = round(1.0 - base_prob - bull_prob, 2)

        base_desc = f"Capital rotates in the predicted {direction.lower()} direction by approx ${magnitude:.1f}B, in line with core macro inputs."

        if direction == "INFLOW":
            bull_desc = f"Accelerated capital inflows by up to ${magnitude * 1.3:.1f}B as macro triggers compound positive sentiments."
            bear_desc = f"Neutral to muted inflows limit rotation to ${magnitude * 0.4:.1f}B if opposing risks materialize."
        elif direction == "OUTFLOW":
            bull_desc = f"Muted capital flight keeps outflows capped at ${magnitude * 0.4:.1f}B if local policy interventions succeed."
            bear_desc = f"Panic-driven capital flight accelerates outflows up to ${magnitude * 1.4:.1f}B due to contagion triggers."
        else:
            bull_desc = "Mild capital reallocation spreads out positive flows."
            bear_desc = "Volatile market corrections limit broad reallocations."

        return [
            {
                "label": "Base Case",
                "description": base_desc,
                "probability": base_prob
            },
            {
                "label": "Bull Case",
                "description": bull_desc,
                "probability": bull_prob
            },
            {
                "label": "Bear Case",
                "description": bear_desc,
                "probability": bear_prob
            }
        ]
