"""
Capital Flow Proxy Calculator.
Calculates statistically defensible market activity proxies and liquidity indicators
from real market observations.
"""
from __future__ import annotations
import math
import numpy as np
from datetime import datetime, timezone


class CapitalFlowProxyCalculator:
    """
    Calculates derived market activity proxies from historical observation time series.
    """

    @staticmethod
    def calculate_abnormal_volume(observations: list[dict], window_size: int = 30) -> dict | None:
        """
        Calculate Abnormal Volume Z-score Signal.
        Formula: Z = (V_t - mean(V)) / std(V)
        """
        volumes = [o["volume"] for o in observations if o.get("volume") is not None and o["volume"] > 0]
        if len(volumes) < 10:
            return None

        recent_vol = volumes[-1]
        baseline_vols = volumes[:-1] if len(volumes) > window_size else volumes
        mean_vol = float(np.mean(baseline_vols))
        std_vol = float(np.std(baseline_vols))

        z_score = (recent_vol - mean_vol) / std_vol if std_vol > 0 else 0.0

        return {
            "indicator_name": "ABNORMAL_VOLUME_SIGNAL",
            "category": "MARKET_PROXY_DATA",
            "value": recent_vol,
            "z_score": round(z_score, 4),
            "formula": "Z_vol = (V_t - mean(V_baseline)) / std(V_baseline)",
            "source_variables": {
                "observed_volume": recent_vol,
                "baseline_mean_volume": round(mean_vol, 2),
                "baseline_std_volume": round(std_vol, 2),
                "sample_size": len(baseline_vols)
            },
            "time_window": f"{window_size}_DAY_BASELINE",
            "calculation_timestamp": datetime.now(timezone.utc),
            "methodology_version": "v6.1"
        }

    @staticmethod
    def calculate_market_activity(observations: list[dict], window_size: int = 30) -> dict | None:
        """
        Calculate Market Activity Signal (Log Return Deviation Z-Score).
        Formula: R_t = ln(P_t / P_{t-1}), Z_return = (R_t - mean(R)) / std(R)
        """
        closes = [o["close_price"] for o in observations if o.get("close_price") is not None]
        if len(closes) < 10:
            return None

        log_returns = []
        for i in range(1, len(closes)):
            if closes[i - 1] > 0:
                log_returns.append(math.log(closes[i] / closes[i - 1]))

        if len(log_returns) < 5:
            return None

        recent_ret = log_returns[-1]
        baseline_rets = log_returns[:-1]
        mean_ret = float(np.mean(baseline_rets))
        std_ret = float(np.std(baseline_rets))

        z_score = (recent_ret - mean_ret) / std_ret if std_ret > 0 else 0.0

        return {
            "indicator_name": "MARKET_ACTIVITY_SIGNAL",
            "category": "MARKET_PROXY_DATA",
            "value": round(recent_ret, 6),
            "z_score": round(z_score, 4),
            "formula": "Z_return = (R_t - mean(R_baseline)) / std(R_baseline)",
            "source_variables": {
                "observed_log_return": round(recent_ret, 6),
                "baseline_mean_return": round(mean_ret, 6),
                "baseline_std_return": round(std_ret, 6),
                "sample_size": len(baseline_rets)
            },
            "time_window": f"{window_size}_DAY_BASELINE",
            "calculation_timestamp": datetime.now(timezone.utc),
            "methodology_version": "v6.1"
        }

    @staticmethod
    def calculate_volatility_change(observations: list[dict], recent_window: int = 5, baseline_window: int = 30) -> dict | None:
        """
        Calculate Volatility Change Ratio.
        Formula: Ratio = std(R_recent) / std(R_baseline)
        """
        closes = [o["close_price"] for o in observations if o.get("close_price") is not None]
        if len(closes) < baseline_window + 1:
            return None

        log_returns = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes)) if closes[i - 1] > 0]
        if len(log_returns) < baseline_window:
            return None

        baseline_std = float(np.std(log_returns[-baseline_window:]))
        recent_std = float(np.std(log_returns[-recent_window:]))

        vol_ratio = recent_std / baseline_std if baseline_std > 0 else 1.0

        return {
            "indicator_name": "VOLATILITY_CHANGE_SIGNAL",
            "category": "MARKET_PROXY_DATA",
            "value": round(vol_ratio, 4),
            "z_score": round(vol_ratio - 1.0, 4),
            "formula": "VolRatio = std(R_recent_5d) / std(R_baseline_30d)",
            "source_variables": {
                "recent_std_volatility": round(recent_std, 6),
                "baseline_std_volatility": round(baseline_std, 6),
                "volatility_ratio": round(vol_ratio, 4)
            },
            "time_window": f"{baseline_window}_DAY_BASELINE",
            "calculation_timestamp": datetime.now(timezone.utc),
            "methodology_version": "v6.1"
        }

    @staticmethod
    def calculate_liquidity_proxy(observations: list[dict]) -> dict | None:
        """
        Calculate Amihud Illiquidity Ratio Proxy.
        Formula: ILIQ = |R_t| / (Volume_t * Close_t)
        """
        if not observations or len(observations) < 2:
            return None

        latest = observations[-1]
        prev = observations[-2]
        p_t = latest.get("close_price")
        p_prev = prev.get("close_price")
        vol_t = latest.get("volume")

        if not p_t or not p_prev or not vol_t or p_prev <= 0 or vol_t <= 0:
            return None

        ret = abs(math.log(p_t / p_prev))
        dollar_volume = vol_t * p_t
        iliq = (ret / dollar_volume) * 1e9  # Scale to per $1B for readability

        return {
            "indicator_name": "LIQUIDITY_PROXY",
            "category": "MARKET_PROXY_DATA",
            "value": round(iliq, 6),
            "z_score": None,
            "formula": "ILIQ = (|R_t| / (Volume_t * Close_t)) * 1e9",
            "source_variables": {
                "close_price": p_t,
                "volume": vol_t,
                "abs_return": round(ret, 6),
                "dollar_volume_usd": round(dollar_volume, 2)
            },
            "time_window": "DAILY",
            "calculation_timestamp": datetime.now(timezone.utc),
            "methodology_version": "v6.1"
        }
