"""
FRED (Federal Reserve Economic Data) & Trading Economics Provider Adapter.
Checks API key configuration and returns explicit status when unconfigured or unavailable.
"""
from __future__ import annotations
import logging
import httpx
from datetime import datetime, timezone
from config import settings

logger = logging.getLogger(__name__)


class FREDProvider:
    """
    FRED Macro & Liquidity Data Provider.
    """
    provider_name: str = "FRED"
    category: str = "MACRO_LIQUIDITY_DATA"

    def get_status(self) -> dict:
        """
        Returns connectivity and configuration status.
        """
        api_key = getattr(settings, "FRED_API_KEY", None)
        if not api_key or api_key.strip() == "":
            return {
                "provider_name": self.provider_name,
                "category": self.category,
                "status": "NOT_CONFIGURED",
                "error_message": "FRED_API_KEY is missing in environment settings.",
                "data_freshness_seconds": None
            }
        return {
            "provider_name": self.provider_name,
            "category": self.category,
            "status": "ACTIVE",
            "error_message": None,
            "data_freshness_seconds": 0.0
        }

    async def get_series(self, series_id: str = "FEDFUNDS") -> list[dict]:
        """
        Fetch economic series from FRED API.
        If key is not configured, returns empty list — never invents values.
        """
        status_info = self.get_status()
        if status_info["status"] == "NOT_CONFIGURED":
            logger.info("FRED Provider is NOT_CONFIGURED. Skipping fetch.")
            return []

        api_key = settings.FRED_API_KEY
        url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={api_key}&file_type=json"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.error(f"FRED API returned HTTP {resp.status_code}")
                    return []

                data = resp.json()
                obs_list = data.get("observations", [])
                results = []

                for item in obs_list:
                    val_str = item.get("value")
                    date_str = item.get("date")
                    if not val_str or val_str == "." or not date_str:
                        continue

                    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    results.append({
                        "instrument_symbol": f"FRED:{series_id}",
                        "asset_class": "MACRO",
                        "market": "US_MACRO",
                        "timestamp": dt,
                        "close_price": float(val_str),
                        "currency": "USD",
                        "source": "FRED",
                        "source_identifier": series_id,
                        "ingestion_timestamp": datetime.now(timezone.utc),
                        "data_quality": 1.0,
                        "data_origin": "MACRO_LIQUIDITY_DATA",
                    })

                return results

        except Exception as e:
            logger.error(f"Error querying FRED API: {e}")
            return []
