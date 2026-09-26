"""
CSV Upload Ingestion Source Adapter.
"""
import csv
import io
from datetime import datetime, timezone
import logging
from dateutil import parser as dateparser
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)


class CSVUploadSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "csv"

    @property
    def source_type(self) -> str:
        return "CSV_UPLOAD"

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        """
        Parse CSV data from 'csv_data' string passed in kwargs.
        Expected headers: title, body, published_at, url, external_id.
        """
        csv_data = kwargs.get("csv_data")
        if not csv_data:
            logger.info("CSV: No csv_data provided. Returning empty list.")
            return []

        try:
            f = io.StringIO(csv_data.strip())
            reader = csv.DictReader(f)
            items: list[IngestionItem] = []

            for row in reader:
                title = row.get("title", "").strip()
                body = row.get("body", "").strip()
                if not title or not body:
                    continue

                pub_str = row.get("published_at", "")
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
                        url=row.get("url"),
                        external_id=row.get("external_id"),
                        metadata_json={k: v for k, v in row.items() if k not in ("title", "body", "published_at", "url", "external_id")}
                    )
                )
            return items
        except Exception as e:
            logger.error(f"CSV: Failed to parse uploaded CSV: {e}")
            return []
