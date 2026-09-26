"""
JSON Upload Ingestion Source Adapter.
"""
import json
from datetime import datetime, timezone
import logging
from dateutil import parser as dateparser
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)


class JSONUploadSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "json"

    @property
    def source_type(self) -> str:
        return "JSON_UPLOAD"

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        """
        Parse JSON data passed in kwargs as a list of dicts or a json string.
        """
        json_data = kwargs.get("json_data")
        if not json_data:
            logger.info("JSON: No json_data provided. Returning empty list.")
            return []

        try:
            if isinstance(json_data, str):
                raw_list = json.loads(json_data)
            elif isinstance(json_data, list):
                raw_list = json_data
            else:
                logger.error("JSON: Unsupported json_data type. Must be string or list.")
                return []

            items: list[IngestionItem] = []
            for entry in raw_list:
                title = entry.get("title", "").strip()
                body = entry.get("body", "").strip()
                if not title or not body:
                    continue

                pub_str = entry.get("published_at", "")
                try:
                    pub_date = dateparser.parse(pub_str) if pub_str else datetime.now(timezone.utc)
                    if pub_date.tzinfo is None:
                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                except Exception:
                    pub_date = datetime.now(timezone.utc)

                items.append(
                    IngestionItem(
                        title=title,
                        body=body,
                        published_at=pub_date,
                        url=entry.get("url"),
                        external_id=entry.get("external_id"),
                        metadata_json={k: v for k, v in entry.items() if k not in ("title", "body", "published_at", "url", "external_id")}
                    )
                )
            return items
        except Exception as e:
            logger.error(f"JSON: Failed to parse uploaded JSON data: {e}")
            return []
