"""
Confidence Model and Risk Scorer.
"""
from config import settings


class CapitalFlowScorer:
    """
    Computes extraction, classification, prediction, and composite confidence scores.
    Also handles risk level calculation based on event severity and density.
    """

    @staticmethod
    def calculate_prediction_confidence(
        evidence_weights: list[float],
        influence_scores: list[float]
    ) -> float:
        """
        Derives the prediction confidence based on evidence weights and SNA influence scores.
        """
        if not evidence_weights:
            return 0.40  # base baseline confidence

        avg_weight = sum(evidence_weights) / len(evidence_weights)
        avg_influence = sum(influence_scores) / len(influence_scores) if influence_scores else 0.5
        
        # Combine evidence strength with network influence
        pred_conf = (avg_weight * 0.6) + (avg_influence * 0.4)
        return round(max(0.10, min(0.95, pred_conf)), 3)

    @staticmethod
    def compute_overall_confidence(
        extraction_conf: float,
        classification_conf: float,
        prediction_conf: float
    ) -> float:
        """
        Computes the weighted composite confidence score.
        Weights: Extraction (20%), Classification (30%), Prediction (50%)
        """
        w_ext = settings.FLOW_CONFIDENCE_EXTRACTION_WEIGHT
        w_cls = settings.FLOW_CONFIDENCE_CLASSIFICATION_WEIGHT
        w_pred = settings.FLOW_CONFIDENCE_PREDICTION_WEIGHT

        overall = (w_ext * extraction_conf) + (w_cls * classification_conf) + (w_pred * prediction_conf)
        return round(max(0.0, min(1.0, overall)), 3)

    @staticmethod
    def evaluate_risk_level(severity: float, overall_confidence: float) -> str:
        """
        Classifies risk based on severity and prediction confidence.
        Categories: LOW, MEDIUM, HIGH, CRITICAL.
        """
        score = severity * 0.7 + (1.0 - overall_confidence) * 0.3
        
        if score >= 0.85:
            return "CRITICAL"
        elif score >= 0.65:
            return "HIGH"
        elif score >= 0.40:
            return "MEDIUM"
        else:
            return "LOW"
