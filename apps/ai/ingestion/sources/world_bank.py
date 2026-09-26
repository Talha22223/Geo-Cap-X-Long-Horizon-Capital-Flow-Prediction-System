"""
World Bank Data360 API Source Adapter.
Fetches real-time macroeconomic indicators and capital flow datasets from https://data360api.worldbank.org
"""
from __future__ import annotations
import logging
import httpx
from datetime import datetime
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)

DATA360_API_URL = "https://data360api.worldbank.org/data360/data"


class WorldBankSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "worldbank"

    @property
    def source_type(self) -> str:
        return "WORLD_BANK"

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        logger.info("World Bank: Querying Data360 API for macroeconomic indicators...")
        
        database_id = kwargs.get("database_id", "WB_WDI")
        indicator = kwargs.get("indicator", "WB_WDI_SE_PRM_CMPT_FE_ZS")
        ref_area = kwargs.get("ref_area", "")
        
        params = {
            "DATABASE_ID": database_id,
            "INDICATOR": indicator,
            "REF_AREA": ref_area,
            "timePeriodFrom": "2020",
            "timePeriodTo": "2025",
        }

        items: list[IngestionItem] = []

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(DATA360_API_URL, params=params)
                if res.status_code == 200:
                    payload = res.json()
                    records = payload.get("value", [])
                    logger.info(f"World Bank: Data360 API returned {len(records)} observation records.")

                    for rec in records:
                        val = rec.get("OBS_VALUE")
                        if not val:
                            continue
                        
                        time_period = rec.get("TIME_PERIOD", "2024")
                        area = rec.get("REF_AREA", "GLOBAL")
                        indicator_name = rec.get("COMMENT_TS") or rec.get("INDICATOR", "Macro Indicator")

                        pub_date = datetime.strptime(f"{time_period}-01-01", "%Y-%m-%d")

                        items.append(
                            IngestionItem(
                                title=f"World Bank Data360: {indicator_name} for {area} ({time_period})",
                                body=(
                                    f"Macroeconomic observation for {area} under indicator {indicator_name}. "
                                    f"Recorded value: {val} {rec.get('UNIT_MEASURE', '')}. "
                                    f"Data source database: {rec.get('DATABASE_ID')}."
                                ),
                                published_at=pub_date,
                                external_id=f"wb-{rec.get('DATABASE_ID')}-{time_period}",
                                metadata_json={
                                    "source_id": f"wb-{area}-{indicator}-{time_period}",
                                    "source_type": "WORLD_BANK",
                                    "obs_value": val,
                                    "ref_area": area,
                                    "time_period": time_period,
                                    "indicator": indicator,
                                    "database_id": database_id,
                                }
                            )
                        )
                else:
                    logger.warning(f"World Bank: API responded with status {res.status_code}")
        except Exception as e:
            logger.error(f"World Bank: Error fetching Data360 API records: {e}")

        return items
