"""
Abstract NLP Provider Interface.

ALL NLP operations in GeoCap-X must go through this contract.
Business logic layers NEVER import spaCy, VADER, FinBERT, or OpenAI directly.
Providers are injected via FastAPI DI from the ProviderRegistry.

To add a new provider:
    1. Subclass BaseNLPProvider
    2. Implement all 5 abstract methods
    3. Register in providers/registry.py
    4. Set NLP_PROVIDER=<name> in .env
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


# ── Result Types ──────────────────────────────────────────────────────────────

class EntityExtractionResult(BaseModel):
    """
    Structured output from entity extraction.
    All fields default to empty — partial extraction is valid.
    """
    countries: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    sectors: list[str] = Field(default_factory=list)
    industries: list[str] = Field(default_factory=list)
    companies: list[str] = Field(default_factory=list)
    commodities: list[str] = Field(default_factory=list)
    currencies: list[str] = Field(default_factory=list)
    organizations: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    asset_classes: list[str] = Field(default_factory=list)
    event_dates: list[date] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    extraction_confidence: float = Field(0.0, ge=0.0, le=1.0)


class SentimentResult(BaseModel):
    """Sentiment classification with financial-domain orientation."""
    sentiment: Literal["BULLISH", "BEARISH", "NEUTRAL"] = "NEUTRAL"
    polarity: float = Field(0.0, ge=-1.0, le=1.0)    # raw score: -1 bearish, +1 bullish
    subjectivity: float = Field(0.0, ge=0.0, le=1.0)  # 0 objective, 1 subjective
    classification_confidence: float = Field(0.0, ge=0.0, le=1.0)


class ClassificationResult(BaseModel):
    """Event domain classification into 19 categories."""
    primary_category: str = "ECONOMIC"
    secondary_categories: list[str] = Field(default_factory=list)
    classification_confidence: float = Field(0.0, ge=0.0, le=1.0)


class KeywordResult(BaseModel):
    """Extracted keywords with relevance scores."""
    keywords: list[str] = Field(default_factory=list)
    key_phrases: list[str] = Field(default_factory=list)


# ── Abstract Provider ─────────────────────────────────────────────────────────

class BaseNLPProvider(ABC):
    """
    Abstract base class for all NLP providers.

    Concrete implementations: SpaCyProvider, FinBERTProvider,
    OpenAIProvider, GeminiProvider, CustomProvider.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name e.g. 'SpaCyProvider'."""
        ...

    @property
    @abstractmethod
    def model_version(self) -> str:
        """Model version string e.g. 'en_core_web_sm-3.7.1'."""
        ...

    @abstractmethod
    async def extract_entities(self, text: str) -> EntityExtractionResult:
        """
        Extract structured entities from financial text.

        Returns EntityExtractionResult with all 15 entity fields populated.
        Must set extraction_confidence based on model certainty.
        """
        ...

    @abstractmethod
    async def classify_event(self, text: str) -> ClassificationResult:
        """
        Classify the text into one of 19 domain categories.

        Must return primary_category and optionally secondary_categories.
        Must set classification_confidence.
        """
        ...

    @abstractmethod
    async def calculate_sentiment(self, text: str) -> SentimentResult:
        """
        Calculate financial sentiment: BULLISH, BEARISH, or NEUTRAL.

        polarity: -1.0 (strongly bearish) to +1.0 (strongly bullish).
        Must set classification_confidence.
        """
        ...

    @abstractmethod
    async def calculate_confidence(self, text: str, context: dict) -> float:
        """
        Calculate overall extraction/analysis confidence score (0.0–1.0).

        context may include: text_length, entity_count, source_reliability, etc.
        """
        ...

    @abstractmethod
    async def generate_keywords(self, text: str) -> KeywordResult:
        """
        Extract relevant keywords and key phrases from text.
        """
        ...
        
    @abstractmethod
    async def generate_summary(self, text: str) -> str:
        """
        Generate a concise, explainable summary of the text.
        """
        ...
        
    @abstractmethod
    async def assess_severity(self, text: str, context: dict) -> float:
        """
        Assess severity/importance score based on category, entities, and context.
        """
        ...

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} provider={self.provider_name} model={self.model_version}>"
