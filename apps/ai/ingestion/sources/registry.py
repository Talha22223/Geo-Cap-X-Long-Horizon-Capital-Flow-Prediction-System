"""
Ingestion Source Adapter Registry.
"""
from __future__ import annotations
import logging
from typing import ClassVar
from ingestion.sources.base import BaseSource
from core.exceptions import SourceNotFoundException

logger = logging.getLogger(__name__)


class SourceRegistry:
    """Registry for all source adapters."""
    
    _registry: ClassVar[dict[str, type[BaseSource]]] = {}
    _instances: ClassVar[dict[str, BaseSource]] = {}

    @classmethod
    def register(cls, name: str, source_class: type[BaseSource]) -> None:
        cls._registry[name] = source_class
        logger.debug(f"Source adapter registered: {name} → {source_class.__name__}")

    @classmethod
    def get_source(cls, name: str) -> BaseSource:
        if name not in cls._registry:
            raise SourceNotFoundException(name)

        if name not in cls._instances:
            source_class = cls._registry[name]
            cls._instances[name] = source_class()
            logger.info(f"Source adapter instantiated: {name}")

        return cls._instances[name]

    @classmethod
    def available_sources(cls) -> list[str]:
        return list(cls._registry.keys())


def register_all_sources() -> None:
    """Register all available source adapters (called on app startup)."""
    # Implemented local/free adapters
    from ingestion.sources.seed import SeedDataSource
    from ingestion.sources.rss import RSSSource
    from ingestion.sources.csv_upload import CSVUploadSource
    from ingestion.sources.json_upload import JSONUploadSource
    from ingestion.sources.manual_entry import ManualEntrySource
    from ingestion.sources.webhook import WebhookSource

    SourceRegistry.register("seed", SeedDataSource)
    SourceRegistry.register("rss", RSSSource)
    SourceRegistry.register("csv", CSVUploadSource)
    SourceRegistry.register("json", JSONUploadSource)
    SourceRegistry.register("manual", ManualEntrySource)
    SourceRegistry.register("webhook", WebhookSource)

    # Interface-ready stubs
    from ingestion.sources.newsapi import NewsAPISource
    from ingestion.sources.gdelt import GDELTSource
    from ingestion.sources.fred import FREDSource
    from ingestion.sources.congress import CongressSource
    from ingestion.sources.world_bank import WorldBankSource
    from ingestion.sources.yahoo_finance import YahooFinanceSource
    from ingestion.sources.trading_economics import TradingEconomicsSource
    from ingestion.sources.kafka_stream import KafkaStreamSource

    SourceRegistry.register("newsapi", NewsAPISource)
    SourceRegistry.register("gdelt", GDELTSource)
    SourceRegistry.register("fred", FREDSource)
    SourceRegistry.register("congress", CongressSource)
    SourceRegistry.register("worldbank", WorldBankSource)
    SourceRegistry.register("yahoo", YahooFinanceSource)
    SourceRegistry.register("tradingeconomics", TradingEconomicsSource)
    SourceRegistry.register("kafka", KafkaStreamSource)

    logger.info(f"Registered source adapters: {SourceRegistry.available_sources()}")
