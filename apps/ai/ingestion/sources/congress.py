"""
Congress.gov API Ingestion Source Adapter.

Fetches legislative & policy data from the official US Congress API (https://api.congress.gov).
API keys are free from api.data.gov / api.congress.gov.
"""
from __future__ import annotations
import logging
import httpx
from datetime import datetime, timezone
import dateutil.parser
from ingestion.sources.base import BaseSource, IngestionItem
from config import settings

logger = logging.getLogger(__name__)


class CongressSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "congress"

    @property
    def source_type(self) -> str:
        return "CONGRESS_API"

    def is_configured(self) -> bool:
        return bool(settings.CONGRESS_API_KEY and settings.CONGRESS_API_KEY.strip())

    async def fetch(self, limit: int = 20, **kwargs) -> list[IngestionItem]:
        if not self.is_configured():
            logger.warning("Congress API: NOT CONFIGURED (missing CONGRESS_API_KEY).")
            return []

        url = f"https://api.congress.gov/v3/bill?api_key={settings.CONGRESS_API_KEY}&format=json&limit={limit}"
        logger.info(f"Congress API: Fetching recent bills from {url[:45]}...")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            logger.error(f"Congress API: Error fetching data: {e}")
            raise

        bills = data.get("bills", [])
        if not isinstance(bills, list):
            bills = [bills]

        items: list[IngestionItem] = []

        for bill in bills:
            if not isinstance(bill, dict):
                continue

            congress_num = bill.get("congress", "")
            b_type = bill.get("type", "").upper()
            b_num = bill.get("number", "")
            raw_title = bill.get("title") or "Congressional Bill"
            
            title = f"[{b_type} {b_num}] {raw_title}" if (b_type and b_num) else raw_title
            
            latest_action = bill.get("latestAction", {})
            action_text = latest_action.get("text", "No action text available") if isinstance(latest_action, dict) else str(latest_action)
            action_date = latest_action.get("actionDate") if isinstance(latest_action, dict) else None
            update_date = bill.get("updateDate")
            
            body = (
                f"Congressional Legislation: {title}. "
                f"Chamber: {bill.get('originChamber', 'U.S. Congress')}. "
                f"Congress Session: {congress_num}. "
                f"Latest Action: {action_text}."
            )

            pub_date = datetime.now(timezone.utc)
            date_str = action_date or update_date
            if date_str:
                try:
                    pub_date = dateutil.parser.parse(date_str)
                    if pub_date.tzinfo is None:
                        pub_date = pub_date.replace(tzinfo=timezone.utc)
                except Exception:
                    pass

            ext_id = f"CONGRESS-{congress_num}-{b_type}-{b_num}" if (congress_num and b_type and b_num) else bill.get("url")

            items.append(
                IngestionItem(
                    title=title,
                    body=body,
                    published_at=pub_date,
                    url=bill.get("url"),
                    external_id=str(ext_id) if ext_id else None,
                    metadata_json={
                        "congress": congress_num,
                        "type": b_type,
                        "number": b_num,
                        "originChamber": bill.get("originChamber"),
                        "latestAction": latest_action,
                        "updateDate": update_date,
                    }
                )
            )

        logger.info(f"Congress API: Successfully fetched {len(items)} items.")
        return items
