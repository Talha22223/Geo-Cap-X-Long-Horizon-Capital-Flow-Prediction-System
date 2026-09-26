"""
RSS Feed Ingestion Source Adapter.
"""
import asyncio
from datetime import datetime, timezone
import logging
import feedparser
from dateutil import parser as dateparser
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)

DEFAULT_FEEDS = [
    "http://feeds.bbci.co.uk/news/business/rss.xml",
    "https://www.marketwatch.com/rss/topstories",
    "https://search.cnbc.com/rs/search/combinedfeed.cxml",
    "https://news.yahoo.com/rss/finance",
    "https://www.ft.com/?format=rss",
]


class RSSSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "rss"

    @property
    def source_type(self) -> str:
        return "RSS"

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        """
        Parse RSS feed(s). If no feed_url is provided, queries default financial news feeds.
        """
        feed_url = kwargs.get("feed_url")
        urls = [feed_url] if feed_url else DEFAULT_FEEDS

        logger.info(f"RSS: Fetching from feeds: {urls}")
        
        async def fetch_one(url: str) -> list[IngestionItem]:
            try:
                # feedparser.parse is blocking, run in executor
                feed = await asyncio.to_thread(feedparser.parse, url)
                items: list[IngestionItem] = []
                
                for entry in feed.entries:
                    pub_date = datetime.now(timezone.utc)
                    if hasattr(entry, "published"):
                        try:
                            pub_date = dateparser.parse(entry.published)
                            if pub_date.tzinfo is None:
                                pub_date = pub_date.replace(tzinfo=timezone.utc)
                        except Exception:
                            pass
                    
                    body = entry.summary if hasattr(entry, "summary") else entry.description if hasattr(entry, "description") else ""
                    title = entry.title if hasattr(entry, "title") else ""
                    url_link = entry.link if hasattr(entry, "link") else None
                    ext_id = entry.id if hasattr(entry, "id") else url_link

                    items.append(
                        IngestionItem(
                            title=title,
                            body=body,
                            published_at=pub_date,
                            url=url_link,
                            external_id=ext_id,
                            metadata_json={"feed_title": feed.feed.get("title", ""), "source_feed_url": url}
                        )
                    )
                return items
            except Exception as e:
                logger.error(f"RSS: Failed to parse feed {url}: {e}")
                return []

        tasks = [fetch_one(u) for u in urls]
        results = await asyncio.gather(*tasks)
        
        all_items = []
        for res in results:
            all_items.extend(res)
            
        logger.info(f"RSS: Total fetched items across all feeds: {len(all_items)}")
        
        # Fallback if somehow everything is empty
        if not all_items and not feed_url:
            logger.warning("RSS: All configured feeds returned empty data.")
            
        return all_items
