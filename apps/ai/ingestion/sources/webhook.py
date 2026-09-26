"""
Webhook Ingestion Source Adapter.
"""
from datetime import datetime, timezone
import logging
from dateutil import parser as dateparser
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)


class WebhookSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "webhook"

    @property
    def source_type(self) -> str:
        return "WEBHOOK"

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        """
        Accept incoming webhook payload dictionary from kwargs.
        """
        payload = kwargs.get("payload")
        if not payload or not isinstance(payload, dict):
            logger.error("Webhook: Valid payload dictionary must be provided.")
            return []

        title = payload.get("title", "").strip()
        body = payload.get("body", "").strip()
        if not title or not body:
            logger.error("Webhook: Title and body are required in payload.")
            return []

        pub_str = payload.get("published_at", "")
        try:
            pub_date = dateparser.parse(pub_str) if pub_str else datetime.now(timezone.utc)
            if pub_date.tzinfo is None:
                pub_date = pub_date.replace(tzinfo=timezone.utc)
        except Exception:
            pub_date = datetime.now(timezone.utc)

        return [
            IngestionItem(
                title=title,
                body=body,
                published_at=pub_date,
                url=payload.get("url"),
                external_id=payload.get("external_id"),
                metadata_json={k: v for k, v in payload.items() if k not in ("title", "body", "published_at", "url", "external_id")}
            )
        ]
