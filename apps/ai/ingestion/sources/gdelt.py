"""
GDELT Ingestion Source Adapter.

Fetches data from GDELT DOC API.
"""
import logging
import httpx
from datetime import datetime, timezone
import dateutil.parser
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)


class GDELTSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "gdelt"

    @property
    def source_type(self) -> str:
        return "GDELT"

    def is_configured(self) -> bool:
        # GDELT DOC API does not require authentication
        return True

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        query = kwargs.get("query", "economy")
        url = f"https://api.gdeltproject.org/api/v2/doc/doc?query={query}&mode=artlist&maxrecords=50&format=json"
        
        logger.info(f"GDELT: Fetching data from {url}")
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            logger.error(f"GDELT: Error fetching data: {e}")
            raise

        articles = data.get("articles", [])
        items: list[IngestionItem] = []
        
        for article in articles:
            pub_date = datetime.now(timezone.utc)
            seendate = article.get("seendate")
            if seendate:
                try:
                    pub_date = dateutil.parser.parse(seendate)
                    if pub_date.tzinfo is None:
                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                except Exception:
                    pass
            
            title = article.get("title", "")
            url = article.get("url")
            
            items.append(
                IngestionItem(
                    title=title,
                    body=title, # GDELT DOC API artlist mostly gives titles, some snippets. We'll use title for both.
                    published_at=pub_date,
                    url=url,
                    external_id=url, # using url as external id
                    metadata_json={
                        "domain": article.get("domain"),
                        "language": article.get("language"),
                        "source_country": article.get("sourcecountry")
                    }
                )
            )
            
        logger.info(f"GDELT: Successfully fetched {len(items)} items.")
        return items
