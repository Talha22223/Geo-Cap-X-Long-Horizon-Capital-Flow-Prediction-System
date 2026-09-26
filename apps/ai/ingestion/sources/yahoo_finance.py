"""
Yahoo Finance Ingestion Source Adapter.
Fetches real-time market news and corporate disclosure feeds across key benchmark instruments.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
import yfinance as yf
from ingestion.sources.base import BaseSource, IngestionItem

logger = logging.getLogger(__name__)

BENCHMARK_SYMBOLS = ["SPY", "QQQ", "TLT", "GLD", "EEM", "USO", "FXE"]


class YahooFinanceSource(BaseSource):
    @property
    def source_name(self) -> str:
        return "yahoo"

    @property
    def source_type(self) -> str:
        return "FINANCIAL_NEWS"

    def is_configured(self) -> bool:
        return True

    async def fetch(self, symbols: list[str] | None = None, limit_per_symbol: int = 5, **kwargs) -> list[IngestionItem]:
        """
        Fetch real-time financial market news and event signals from Yahoo Finance.
        """
        target_symbols = symbols or BENCHMARK_SYMBOLS
        items: list[IngestionItem] = []
        seen_titles: set[str] = set()

        for sym in target_symbols:
            try:
                ticker = yf.Ticker(sym)
                news_list = getattr(ticker, "news", []) or []

                for raw in news_list[:limit_per_symbol]:
                    content = raw.get("content", raw)
                    title = content.get("title") or raw.get("title")
                    if not title or title in seen_titles:
                        continue
                    seen_titles.add(title)

                    summary = (
                        content.get("summary")
                        or content.get("description")
                        or raw.get("summary")
                        or raw.get("description")
                        or title
                    )

                    pub_str = content.get("pubDate") or raw.get("providerPublishTime")
                    pub_dt = datetime.now(timezone.utc)
                    if isinstance(pub_str, str):
                        try:
                            pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    elif isinstance(pub_str, (int, float)):
                        try:
                            pub_dt = datetime.fromtimestamp(pub_str, tz=timezone.utc)
                        except Exception:
                            pass

                    url = None
                    canon = content.get("canonicalUrl")
                    if isinstance(canon, dict):
                        url = canon.get("url")
                    elif isinstance(canon, str):
                        url = canon
                    elif "link" in raw:
                        url = raw["link"]

                    provider_name = "Yahoo Finance"
                    prov = content.get("provider")
                    if isinstance(prov, dict):
                        provider_name = prov.get("displayName", provider_name)

                    item = IngestionItem(
                        title=title,
                        body=summary,
                        published_at=pub_dt,
                        url=url,
                        external_id=raw.get("id") or content.get("id"),
                        metadata_json={
                            "ticker": sym,
                            "provider": provider_name,
                            "source": "YAHOO_FINANCE",
                            "ingested_at": datetime.now(timezone.utc).isoformat(),
                        },
                    )
                    items.append(item)
            except Exception as e:
                logger.warning(f"YahooFinanceSource: Failed fetching news for {sym}: {e}")

        logger.info(f"YahooFinanceSource: Ingested {len(items)} live market news items across {len(target_symbols)} tickers.")
        return items
