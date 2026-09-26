"""
Manual Entry Ingestion Source Adapter.
"""
from datetime import datetime, timezone
import logging
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)


class ManualEntrySource(BaseSource):
    @property
    def source_name(self) -> str:
        return "manual"

    @property
    def source_type(self) -> str:
        return "MANUAL"

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        """
        Accept manual entry properties directly from kwargs.
        """
        title = kwargs.get("title")
        body = kwargs.get("body")
        if not title or not body:
            logger.error("Manual: Title and body must be provided.")
            return []

        published_at = kwargs.get("published_at") or datetime.now(timezone.utc)
        url = kwargs.get("url")
        external_id = kwargs.get("external_id")

        return [
            IngestionItem(
                title=title,
                body=body,
                published_at=published_at,
                url=url,
                external_id=external_id,
                metadata_json=kwargs.get("metadata_json") or {}
            )
        ]
