"""
Trading Economics Ingestion Source Adapter.

Fetches data from Trading Economics API if configured.
"""
import logging
import httpx
from datetime import datetime, timezone
import dateutil.parser
from ingestion.sources.base import BaseSource, IngestionItem
from config import settings

logger = logging.getLogger(__name__)


class TradingEconomicsSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "tradingeconomics"

    @property
    def source_type(self) -> str:
        return "TRADING_ECONOMICS"

    def is_configured(self) -> bool:
        return bool(settings.TRADING_ECONOMICS_API_KEY)

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        if not self.is_configured():
            logger.warning("Trading Economics: NOT CONFIGURED (missing API key).")
            return []

        # Example: Fetching recent news
        url = f"https://api.tradingeconomics.com/news?c={settings.TRADING_ECONOMICS_API_KEY}&f=json"
        
        logger.info("Trading Economics: Fetching recent news")
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            logger.error(f"Trading Economics: Error fetching data: {e}")
            raise

        if not isinstance(data, list):
            data = [data]

        items: list[IngestionItem] = []
        
        for item in data:
            if not isinstance(item, dict):
                continue
                
            pub_date = datetime.now(timezone.utc)
            date_str = item.get("date")
            if date_str:
                try:
                    pub_date = dateutil.parser.parse(date_str)
                    if pub_date.tzinfo is None:
                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                except Exception:
                    pass
            
            title = item.get("title") or "Trading Economics News"
            ext_id = item.get("id") or item.get("url")
            
            items.append(
                IngestionItem(
                    title=title,
                    body=item.get("description") or title,
                    published_at=pub_date,
                    url=item.get("url"),
                    external_id=str(ext_id) if ext_id else None,
                    metadata_json={
                        "country": item.get("country"),
                        "category": item.get("category"),
                        "symbol": item.get("symbol")
                    }
                )
            )
            
        logger.info(f"Trading Economics: Successfully fetched {len(items)} items.")
        return items
