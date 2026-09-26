"""
Stub NLP Provider — for unit & integration tests only.

Returns deterministic, minimal results.
Requires NO external models, APIs, or heavy dependencies.
Used when NLP_PROVIDER=stub in test environments.
"""
from __future__ import annotations
import logging
from providers.base import (
    BaseNLPProvider,
    ClassificationResult,
    EntityExtractionResult,
    KeywordResult,
    SentimentResult,
)

logger = logging.getLogger(__name__)


class StubNLPProvider(BaseNLPProvider):
    """
    Deterministic stub provider that satisfies the BaseNLPProvider contract
    without any ML inference. Useful for tests and CI pipelines.
    """

    @property
    def provider_name(self) -> str:
        return "StubNLPProvider"

    @property
    def model_version(self) -> str:
        return "stub-1.0.0"

    async def extract_entities(self, text: str) -> EntityExtractionResult:
        logger.debug("StubProvider: returning deterministic entity extraction")
        # Return a small, predictable set of entities based on text length
        keywords = text.lower().split()[:5] if text else []
        return EntityExtractionResult(
            countries=["US"],
            regions=["North America"],
            sectors=["Finance"],
            industries=["Banking"],
            companies=[],
            commodities=[],
            currencies=["USD"],
            organizations=["Federal Reserve"],
            people=[],
            asset_classes=["Equity"],
            event_dates=[],
            keywords=keywords,
            extraction_confidence=0.75,
        )

    async def classify_event(self, text: str) -> ClassificationResult:
        logger.debug("StubProvider: returning deterministic event classification")
        # Classify based on simple keyword matching for test predictability
        text_lower = text.lower()
        if any(w in text_lower for w in ("rate", "interest", "inflation", "fed", "federal reserve")):
            category = "MONETARY_POLICY"
        elif any(w in text_lower for w in ("trade", "tariff", "ban", "chip", "export")):
            category = "TRADE"
        elif any(w in text_lower for w in ("war", "conflict", "geopolit", "sanction")):
            category = "GEOPOLITICAL"
        else:
            category = "ECONOMIC"

        return ClassificationResult(
            primary_category=category,
            secondary_categories=[],
            classification_confidence=0.8,
        )

    async def calculate_sentiment(self, text: str) -> SentimentResult:
        logger.debug("StubProvider: returning deterministic sentiment")
        text_lower = text.lower()
        if any(w in text_lower for w in ("hike", "ban", "sanction", "decline", "fall", "crash")):
            sentiment, polarity = "BEARISH", -0.4
        elif any(w in text_lower for w in ("surge", "rally", "growth", "recover", "boom")):
            sentiment, polarity = "BULLISH", 0.4
        else:
            sentiment, polarity = "NEUTRAL", 0.0

        return SentimentResult(
            sentiment=sentiment,
            polarity=polarity,
            subjectivity=0.3,
            classification_confidence=0.75,
        )

    async def calculate_confidence(self, text: str, context: dict) -> float:
        return 0.75

    async def generate_keywords(self, text: str) -> KeywordResult:
        words = [w.strip(".,!?;:") for w in text.split() if len(w) > 3]
        return KeywordResult(
            keywords=list(dict.fromkeys(words))[:10],
            key_phrases=[text[:50]] if text else [],
        )

    async def generate_summary(self, text: str) -> str:
        return text[:100] if text else "Stub summary."

    async def assess_severity(self, text: str, context: dict) -> float:
        return 0.5
