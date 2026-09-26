"""
Abstract Base Class for all Ingestion Sources.
"""
from abc import ABC, abstractmethod
from typing import Any
from datetime import datetime


class IngestionItem:
    """Standardized transfer object for raw ingested items."""
    def __init__(
        self,
        title: str,
        body: str,
        published_at: datetime,
        url: str | None = None,
        external_id: str | None = None,
        metadata_json: dict[str, Any] | None = None,
    ) -> None:
        self.title = title
        self.body = body
        self.published_at = published_at
        self.url = url
        self.external_id = external_id
        self.metadata_json = metadata_json or {}


class BaseSource(ABC):
    """
    Abstract contract for all data source adapters.

    Implementations cover NewsAPI, FRED, GDELT, RSS, etc.
    """

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Name of the source, e.g., 'newsapi', 'fred'."""
        ...

    @property
    @abstractmethod
    def source_type(self) -> str:
        """Type tag, e.g., NEWS, ECONOMIC_DATA."""
        ...

    def is_configured(self) -> bool:
        """
        Check if the source has the necessary configuration/credentials to run.
        Defaults to True for sources that don't need credentials.
        """
        return True

    @abstractmethod
    async def fetch(self, **kwargs) -> list[IngestionItem]:
        """
        Fetch raw feeds from target source.
        Returns a list of standardized IngestionItem transfer objects.
        """
        ...
