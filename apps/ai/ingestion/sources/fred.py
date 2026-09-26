"""
FRED (Federal Reserve Economic Data) Source Adapter.

Fetches data from FRED API if configured.
"""
import logging
import httpx
from datetime import datetime, timezone
import dateutil.parser
from ingestion.sources.base import BaseSource, IngestionItem
from config import settings

logger = logging.getLogger(__name__)


class FREDSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "fred"

    @property
    def source_type(self) -> str:
        return "FRED"

    def is_configured(self) -> bool:
        return bool(settings.FRED_API_KEY)

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        if not self.is_configured():
            logger.warning("FRED: NOT CONFIGURED (missing API key).")
            return []

        # Example: Fetching recent releases
        url = f"https://api.stlouisfed.org/fred/releases?api_key={settings.FRED_API_KEY}&file_type=json"
        
        logger.info("FRED: Fetching recent releases")
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            logger.error(f"FRED: Error fetching data: {e}")
            raise

        releases = data.get("releases", [])
        items: list[IngestionItem] = []
        
        for release in releases:
            pub_date = datetime.now(timezone.utc)
            realtime_start = release.get("realtime_start")
            if realtime_start:
                try:
                    pub_date = dateutil.parser.parse(realtime_start)
                    if pub_date.tzinfo is None:
                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                except Exception:
                    pass
            
            title = release.get("name") or "FRED Data Release"
            ext_id = str(release.get("id"))
            
            items.append(
                IngestionItem(
                    title=f"FRED Release: {title}",
                    body=f"Federal Reserve Economic Data release for {title}. Release ID: {ext_id}",
                    published_at=pub_date,
                    url=release.get("link"),
                    external_id=ext_id,
                    metadata_json={
                        "press_release": release.get("press_release")
                    }
                )
            )
            
        logger.info(f"FRED: Successfully fetched {len(items)} items.")
        return items
