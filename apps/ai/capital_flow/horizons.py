"""
Multi-Horizon Temporal Decay Aggregator.
"""
from config import settings


class HorizonAggregator:
    """
    Applies temporal decay to capital flow magnitudes based on target horizons.
    Longer horizons (3Y, 5Y) incorporate systemic discount factors.
    """

    @staticmethod
    def get_decay_factor(horizon: str) -> float:
        """Get decay factor defined in configuration settings."""
        mapping = {
            "SIX_MONTHS": settings.FLOW_HORIZON_DECAY_6M,
            "ONE_YEAR": settings.FLOW_HORIZON_DECAY_1Y,
            "THREE_YEARS": settings.FLOW_HORIZON_DECAY_3Y,
            "FIVE_YEARS": settings.FLOW_HORIZON_DECAY_5Y,
        }
        return mapping.get(horizon.upper(), 0.50)

    @classmethod
    def scale_rotation(cls, base_magnitude: float, horizon: str) -> float:
        """
        Scale base rotation magnitude to match target horizon.
        """
        decay = cls.get_decay_factor(horizon)
        return round(base_magnitude * decay, 2)
