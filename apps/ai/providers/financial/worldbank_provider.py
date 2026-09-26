"""
World Bank Financial & Macro Data Provider.
Fetches real macro-economic data (GDP, Inflation, Interest Rates) using World Bank REST API.
"""
from __future__ import annotations
import logging
import httpx
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Map common country names to ISO2/ISO3 codes
COUNTRY_CODES = {
    "UNITED STATES": "USA",
    "US": "USA",
    "CHINA": "CHN",
    "GERMANY": "DEU",
    "JAPAN": "JPN",
    "UNITED KINGDOM": "GBR",
    "FRANCE": "FRA",
    "INDIA": "IND",
    "BRAZIL": "BRA",
    "CANADA": "CAN",
}


class WorldBankProvider:
    """
    World Bank Data Provider for Macro-Economic Indicators.
    """
    provider_name: str = "WORLD_BANK"
    category: str = "MACRO_LIQUIDITY_DATA"

    async def get_macro_indicator(self, country: str, indicator_code: str = "NY.GDP.MKTP.KD.ZG") -> list[dict]:
        """
        Fetch annual macro time series for a country.
        Indicator default: Real GDP Growth %.
        """
        iso_code = COUNTRY_CODES.get(country.upper().strip(), "USA")
        url = f"http://api.worldbank.org/v2/country/{iso_code}/indicator/{indicator_code}?format=json&per_page=30"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"World Bank API returned status {resp.status_code} for {country}")
                    return []

                data = resp.json()
                if not data or len(data) < 2 or not data[1]:
                    logger.warning(f"No World Bank data found for country {country}")
                    return []

                records = data[1]
                observations = []

                for rec in records:
                    val = rec.get("value")
                    year = rec.get("date")
                    if val is None or not year:
                        continue

                    dt = datetime(int(year), 1, 1, tzinfo=timezone.utc)
                    observations.append({
                        "instrument_symbol": f"WB:{iso_code}:{indicator_code}",
                        "asset_class": "MACRO",
                        "market": "GLOBAL_MACRO",
                        "timestamp": dt,
                        "close_price": float(val),
                        "currency": "USD",
                        "source": "WORLD_BANK",
                        "source_identifier": f"{iso_code}:{indicator_code}",
                        "ingestion_timestamp": datetime.now(timezone.utc),
                        "data_quality": 1.0,
                        "data_origin": "MACRO_LIQUIDITY_DATA",
                    })

                return observations

        except Exception as e:
            logger.error(f"Error querying World Bank API for {country}: {e}")
            return []
