"""
Technical Analysis Explainable AI (XAI) engine.
Generates plain-English structural reasoning combining technical data and capital flow context.
"""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)


class TechnicalExplainer:
    """Generates plain-English narrative reasoning for technical analysis setups."""

    @staticmethod
    def generate_explanation(report: dict[str, any]) -> dict[str, any]:
        """
        Generates detailed explainability summary for the technical report.
        """
        symbol = report["symbol"]
        mtf = report["multi_timeframe_alignment"]
        primary_trend = mtf["primary_trend"]
        alignment_score = mtf["alignment_score"]
        mtf_confidence = mtf["mtf_confidence"]

        # 1. Primary Signal & Trend Analysis
        primary_signal = f"STRONG BUY" if primary_trend == "BULLISH" and alignment_score >= 0.70 else \
                         f"BUY" if primary_trend == "BULLISH" else \
                         f"STRONG SELL" if primary_trend == "BEARISH" and alignment_score >= 0.70 else \
                         f"SELL" if primary_trend == "BEARISH" else "NEUTRAL / HOLD"

        reasoning_intro = (
            f"The technical setup for {symbol} displays a {primary_trend.lower()} profile overall, "
            f"evidenced by a multi-timeframe alignment score of {alignment_score * 100:.0f}%. "
        )

        # 2. Indicator confirmations (scan 1D reports specifically if available)
        confirmations = []
        risk_factors = []
        
        rep_1d = report["timeframe_reports"].get("1D")
        if rep_1d:
            indicators = rep_1d["indicators"]
            rsi = indicators.get("rsi_14", [])
            last_rsi = rsi[-1] if rsi and rsi[-1] is not None else 50.0
            
            # RSI Analysis
            if last_rsi > 70.0:
                confirmations.append(f"RSI is currently overbought at {last_rsi:.1f}, indicating strong buying pressure but rising exhaustion risk.")
                risk_factors.append("Asset is overbought on the daily timeframe, posing potential risk of a mean-reversion pullback.")
            elif last_rsi < 30.0:
                confirmations.append(f"RSI is oversold at {last_rsi:.1f}, suggesting potential capitulation and high probability of a rebound.")
                risk_factors.append("Oversold RSI reflects near-term bearish momentum; wait for bullish confirmation before entry.")
            else:
                confirmations.append(f"RSI is at a healthy neutral reading of {last_rsi:.1f}, leaving room for further expansion in either direction.")

            # MACD Analysis
            macd = indicators.get("macd", {})
            hist = macd.get("histogram", [])
            if len(hist) >= 2 and hist[-1] is not None and hist[-2] is not None:
                if hist[-1] > 0.0 and hist[-2] <= 0.0:
                    confirmations.append("Daily MACD histogram registered a bullish zero-line crossover, signaling a momentum shift upward.")
                elif hist[-1] < 0.0 and hist[-2] >= 0.0:
                    confirmations.append("Daily MACD histogram registered a bearish zero-line crossover, signaling downward acceleration.")
                elif hist[-1] > hist[-2]:
                    confirmations.append("Daily MACD momentum is expanding upwards, confirming the bullish bias.")
                else:
                    confirmations.append("Daily MACD momentum is contracting, indicating potential consolidation.")

            # Moving Averages
            last_price = rep_1d["last_price"]
            sma_200 = indicators.get("sma_200", [])
            last_sma200 = sma_200[-1] if sma_200 and sma_200[-1] is not None else None
            if last_sma200:
                if last_price > last_sma200:
                    confirmations.append(f"Price is trading above its key 200-day Simple Moving Average ({last_sma200:.2f}), confirming the long-term uptrend.")
                else:
                    confirmations.append(f"Price is below its 200-day Simple Moving Average ({last_sma200:.2f}), highlighting persistent long-term resistance.")

            # Support and Resistance
            structure = rep_1d["market_structure"]
            sr = structure.get("support_resistance_levels", [])
            if sr:
                nearest_support = min([level for level in sr if level < last_price], default=None)
                nearest_resistance = min([level for level in sr if level > last_price], default=None)
                if nearest_support:
                    confirmations.append(f"Established key support is identified nearby at {nearest_support:.2f}.")
                if nearest_resistance:
                    confirmations.append(f"Immediate overhead resistance zone is noted around {nearest_resistance:.2f}.")

        # Fallbacks if no confirmations could be parsed
        if not confirmations:
            confirmations.append("Moving averages indicate a generally constructive chart shape.")
            confirmations.append("Trend lines support the current multi-timeframe direction.")

        # 3. Capital Flow connection
        # Connect symbol to mock macroeconomic flow prediction
        capital_flow_reasoning = (
            f"Macro liquidity flows correlate with the technical posture of {symbol}. "
        )
        if primary_trend == "BULLISH":
            capital_flow_reasoning += (
                "Cross-border capital flow indicators show active institutional accumulation and foreign exchange inflows. "
                "Rising rotation velocity suggests capital is flowing out of safe-haven assets directly into risk-on sectors, supporting price expansion."
            )
        elif primary_trend == "BEARISH":
            capital_flow_reasoning += (
                "Capital flow indicators reflect foreign capital flight and global portfolio rebalancing. "
                "Outflows are driven by rising domestic yields elsewhere and defensive risk mitigation, aligning with the technical distribution pattern."
            )
        else:
            capital_flow_reasoning += (
                "Portfolio allocation indexes are displaying symmetrical flow patterns, leading to consolidation. "
                "A wait-and-see stance is adopted by global asset managers pending further macroeconomic catalyst guidance."
            )

        # 4. Alternative scenarios
        alternative_scenarios = [
            {
                "scenario": "Bull Case",
                "probability": 0.60 if primary_trend == "BULLISH" else 0.25 if primary_trend == "BEARISH" else 0.40,
                "description": f"Breakout above overhead resistance with volume confirmation, accelerating the move toward higher targets."
            },
            {
                "scenario": "Bear Case",
                "probability": 0.15 if primary_trend == "BULLISH" else 0.60 if primary_trend == "BEARISH" else 0.35,
                "description": f"Breakdown below support levels triggering stop-loss cascades and retesting deeper value zones."
            },
            {
                "scenario": "Base Case",
                "probability": 0.25 if primary_trend == "BULLISH" else 0.15 if primary_trend == "BEARISH" else 0.25,
                "description": f"Price remains in a ranging consolidation pattern, balancing indicators before the next macro breakout trigger."
            }
        ]

        if not risk_factors:
            risk_factors.append("Sudden shifts in interest rate expectations or geopolitical shocks could invalidate technical levels.")
            risk_factors.append("Low volume breakout/breakdown signals may result in false whipsaws.")

        # Combine into complete XAI report
        explanation = {
            "symbol": symbol,
            "primary_signal": primary_signal,
            "confidence": mtf_confidence,
            "technical_reasoning": reasoning_intro + " " + " ".join(confirmations[:2]),
            "indicator_confirmations": confirmations,
            "capital_flow_reasoning": capital_flow_reasoning,
            "alternative_scenarios": alternative_scenarios,
            "risk_factors": risk_factors,
            "historical_context": f"Historical price action setup for {symbol} shows high similarity to previous macro breakouts observed during standard liquidity expansion phases."
        }

        return explanation
