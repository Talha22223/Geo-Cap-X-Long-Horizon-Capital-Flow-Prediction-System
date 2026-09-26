"""
OpenAI NLP Provider Stub.

Ready for Phase 6 GPT-4o structured extraction.
"""
from __future__ import annotations
import logging
from datetime import date
from providers.base import (
    BaseNLPProvider,
    ClassificationResult,
    EntityExtractionResult,
    KeywordResult,
    SentimentResult,
)

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseNLPProvider):
    @property
    def provider_name(self) -> str:
        return "OpenAIProvider"

    @property
    def model_version(self) -> str:
        return "gpt-4o-2024-05-13"

    async def extract_entities(self, text: str) -> EntityExtractionResult:
        logger.info("OpenAI: falling back to stub entity extraction")
        return EntityExtractionResult(
            countries=[],
            regions=[],
            sectors=[],
            industries=[],
            companies=[],
            commodities=[],
            currencies=[],
            organizations=[],
            people=[],
            asset_classes=[],
            event_dates=[],
            keywords=[],
            extraction_confidence=0.5,
        )

    async def classify_event(self, text: str) -> ClassificationResult:
        logger.info("OpenAI: falling back to stub event classification")
        return ClassificationResult(
            primary_category="ECONOMIC",
            secondary_categories=[],
            classification_confidence=0.5,
        )

    async def calculate_sentiment(self, text: str) -> SentimentResult:
        logger.info("OpenAI: falling back to stub sentiment analysis")
        return SentimentResult(
            sentiment="NEUTRAL",
            polarity=0.0,
            subjectivity=0.0,
            classification_confidence=0.5,
        )

    async def calculate_confidence(self, text: str, context: dict) -> float:
        return 0.5

    async def generate_keywords(self, text: str) -> KeywordResult:
        return KeywordResult(keywords=[], key_phrases=[])
