"""
Cross-Asset & Sector Co-Movement Analysis Engine (V6.2).
Analyzes whether mapped assets in related chains (Commodity -> Sector ETF -> Equity -> Currency)
exhibit aligned statistical abnormalities without asserting causation.
"""
from __future__ import annotations
import logging
from capital_flow.abnormality import StatisticalAbnormalityDetector

logger = logging.getLogger(__name__)

# Standard chain mappings for cross-asset analysis
ASSET_CHAINS = {
    "ENERGY": ["CL=F", "XLE"],
    "FINANCIAL SERVICES": ["XLF", "EURUSD=X"],
    "FINANCIALS": ["XLF", "EURUSD=X"],
    "MONETARY_POLICY": ["US10Y", "EURUSD=X", "SPY"],
    "INFLATION": ["GLD", "US10Y"],
}


class CrossAssetAnalyzer:
    """
    Analyzes cross-asset anomaly alignment across related asset chains.
    """

    @staticmethod
    def analyze_cross_asset_alignment(
        category_or_sector: str,
        asset_observations_map: dict[str, list[dict]]
    ) -> dict:
        """
        Calculates cross-asset co-movement alignment across related instruments.
        """
        key = category_or_sector.upper().strip()
        chain_symbols = ASSET_CHAINS.get(key, ["SPY"])

        aligned_assets = []
        unaligned_assets = []

        for sym in chain_symbols:
            obs = asset_observations_map.get(sym, [])
            if not obs or len(obs) < 10:
                continue

            closes = [o["close_price"] for o in obs if o.get("close_price") is not None]
            if len(closes) < 10:
                continue

            latest_val = closes[-1]
            baseline = closes[:-1]
            z_res = StatisticalAbnormalityDetector.calculate_z_score(latest_val, baseline)

            z_score = z_res.get("z_score")
            if z_score is not None and abs(z_score) >= 1.5:
                aligned_assets.append({
                    "instrument_symbol": sym,
                    "z_score": z_score,
                    "percentile": z_res.get("percentile"),
                    "status": "ALIGNED_ANOMALY"
                })
            else:
                unaligned_assets.append({
                    "instrument_symbol": sym,
                    "z_score": z_score if z_score is not None else 0.0,
                    "status": "NORMAL"
                })

        total_eval = len(aligned_assets) + len(unaligned_assets)
        alignment_score = round(len(aligned_assets) / total_eval, 4) if total_eval > 0 else 0.0

        return {
            "chain_evaluated": chain_symbols,
            "alignment_score": alignment_score,
            "aligned_assets_count": len(aligned_assets),
            "unaligned_assets_count": len(unaligned_assets),
            "aligned_assets": aligned_assets,
            "unaligned_assets": unaligned_assets,
            "disclaimer": "Cross-asset alignment measures statistical co-movement across related asset chains. It does NOT prove causal transmission."
        }
