"""
NewsAPI Ingestion Source Adapter.

Fetches data from NewsAPI if configured.
"""
import logging
import httpx
from datetime import datetime, timezone
import dateutil.parser
from ingestion.sources.base import BaseSource, IngestionItem
from config import settings

logger = logging.getLogger(__name__)


class NewsAPISource(BaseSource):
    @property
    def source_name(self) -> str:
        return "newsapi"

    @property
    def source_type(self) -> str:
        return "NEWSAPI"

    def is_configured(self) -> bool:
        return bool(settings.NEWSAPI_KEY)

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        if not self.is_configured():
            logger.warning("NewsAPI: NOT CONFIGURED (missing API key).")
            return []

        query = kwargs.get("query", "economy OR finance")
        url = f"https://newsapi.org/v2/everything?q={query}&language=en&sortBy=publishedAt&pageSize=50"
        
        logger.info(f"NewsAPI: Fetching data from {url}")
        
        headers = {"X-Api-Key": settings.NEWSAPI_KEY}
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            logger.error(f"NewsAPI: Error fetching data: {e}")
            raise

        articles = data.get("articles", [])
        items: list[IngestionItem] = []
        
        for article in articles:
            pub_date = datetime.now(timezone.utc)
            published_at = article.get("publishedAt")
            if published_at:
                try:
                    pub_date = dateutil.parser.parse(published_at)
                    if pub_date.tzinfo is None:
                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                except Exception:
                    pass
            
            title = article.get("title") or ""
            body = article.get("content") or article.get("description") or title
            url_link = article.get("url")
            
            source_info = article.get("source", {})
            
            items.append(
                IngestionItem(
                    title=title,
                    body=body,
                    published_at=pub_date,
                    url=url_link,
                    external_id=url_link,
                    metadata_json={
                        "source_name": source_info.get("name"),
                        "author": article.get("author")
                    }
                )
            )
            
        logger.info(f"NewsAPI: Successfully fetched {len(items)} items.")
        return items
