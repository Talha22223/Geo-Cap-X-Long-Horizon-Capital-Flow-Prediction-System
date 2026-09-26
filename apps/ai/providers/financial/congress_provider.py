"""
US Congress Legislative & Policy Data Provider.
Checks API key configuration and fetches legislative bill actions from official Congress API (https://api.congress.gov).
"""
from __future__ import annotations
import logging
import httpx
from datetime import datetime, timezone
import dateutil.parser
from config import settings

logger = logging.getLogger(__name__)


class CongressProvider:
    """
    US Congress Legislative & Policy Provider.
    """
    provider_name: str = "CONGRESS"
    category: str = "LEGISLATIVE_POLICY_DATA"

    def get_status(self) -> dict:
        """
        Returns connectivity and configuration status.
        """
        api_key = getattr(settings, "CONGRESS_API_KEY", None)
        if not api_key or api_key.strip() == "":
            return {
                "provider_name": self.provider_name,
                "category": self.category,
                "status": "NOT_CONFIGURED",
                "error_message": "CONGRESS_API_KEY is missing in environment settings.",
                "data_freshness_seconds": None
            }
        return {
            "provider_name": self.provider_name,
            "category": self.category,
            "status": "ACTIVE",
            "error_message": None,
            "data_freshness_seconds": 0.0
        }

    async def get_bills(self, limit: int = 20) -> list[dict]:
        """
        Fetch recent legislative bills from Congress.gov API.
        If key is not configured, returns empty list — never invents values.
        """
        status_info = self.get_status()
        if status_info["status"] == "NOT_CONFIGURED":
            logger.info("Congress Provider is NOT_CONFIGURED. Skipping fetch.")
            return []

        api_key = settings.CONGRESS_API_KEY
        url = f"https://api.congress.gov/v3/bill?api_key={api_key}&format=json&limit={limit}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.error(f"Congress API returned HTTP {resp.status_code}")
                    return []

                data = resp.json()
                bills = data.get("bills", [])
                if not isinstance(bills, list):
                    bills = [bills]

                results = []
                for bill in bills:
                    if not isinstance(bill, dict):
                        continue

                    congress_num = bill.get("congress", "")
                    b_type = bill.get("type", "").upper()
                    b_num = bill.get("number", "")
                    title = bill.get("title") or "Congressional Bill"
                    latest_action = bill.get("latestAction", {})
                    update_date = bill.get("updateDate")

                    dt = datetime.now(timezone.utc)
                    if update_date:
                        try:
                            parsed_dt = dateutil.parser.parse(update_date)
                            dt = parsed_dt if parsed_dt.tzinfo else parsed_dt.replace(tzinfo=timezone.utc)
                        except Exception:
                            pass

                    results.append({
                        "instrument_symbol": f"CONGRESS:{b_type}{b_num}",
                        "asset_class": "POLICY",
                        "market": "US_LEGISLATIVE",
                        "timestamp": dt,
                        "title": title,
                        "congress": congress_num,
                        "bill_type": b_type,
                        "bill_number": b_num,
                        "chamber": bill.get("originChamber"),
                        "latest_action": latest_action.get("text") if isinstance(latest_action, dict) else str(latest_action),
                        "source": "CONGRESS",
                        "source_identifier": f"CONGRESS-{congress_num}-{b_type}-{b_num}",
                        "ingestion_timestamp": datetime.now(timezone.utc),
                        "data_quality": 1.0,
                        "data_origin": "LEGISLATIVE_POLICY_DATA",
                    })

                return results

        except Exception as e:
            logger.error(f"Error querying Congress API: {e}")
            return []
