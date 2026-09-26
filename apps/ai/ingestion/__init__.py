"""
Ingestion Package.
"""
from ingestion.pipeline import IngestionPipeline
from ingestion.normalizer import TextNormalizer
from ingestion.deduplicator import MultiStrategyDeduplicator

__all__ = ["IngestionPipeline", "TextNormalizer", "MultiStrategyDeduplicator"]
