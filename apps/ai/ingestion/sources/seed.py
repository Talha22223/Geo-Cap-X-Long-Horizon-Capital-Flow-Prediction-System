"""
Seed data source adapter.

Reads high-fidelity historical events to feed the pipeline.
"""
from datetime import datetime, timezone
from ingestion.sources.base import BaseSource, IngestionItem
from seed_data.historical_events import HISTORICAL_EVENTS


class SeedDataSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "seed"

    @property
    def source_type(self) -> str:
        return "SEED"

    async def fetch(self, **kwargs) -> list[IngestionItem]:
        """Convert historical seed events into IngestionItems."""
        items: list[IngestionItem] = []
        for ev in HISTORICAL_EVENTS:
            items.append(
                IngestionItem(
                    title=ev["title"],
                    body=ev["body"],
                    published_at=ev.get("published_at") or datetime.now(timezone.utc),
                    url=f"http://seed-history-source.local/event/{ev['event_date'].isoformat()}",
                    external_id=f"seed-{ev['event_date'].isoformat()}-{ev['title'][:20].lower().replace(' ', '-')}",
                    metadata_json={
                        "target_country": ev.get("country"),
                        "target_region": ev.get("region"),
                        "target_sector": ev.get("sector"),
                        "target_industry": ev.get("industry"),
                        "target_commodity": ev.get("commodity"),
                        "target_currency": ev.get("currency"),
                        "target_category": ev.get("category"),
                        "target_severity": ev.get("severity"),
                        "target_event_date": ev["event_date"].isoformat(),
                        "target_source": ev.get("source"),
                        "target_expected_direction": ev.get("expected_direction"),
                        "target_confidence": ev.get("confidence"),
                        "target_evidence": ev.get("evidence"),
                    }
                )
            )
        return items
