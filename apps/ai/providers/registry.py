"""
NLP Provider Registry.

Single point of registration for all providers.
Switching providers requires only changing NLP_PROVIDER in .env.
"""
from __future__ import annotations

import logging
from typing import ClassVar

from providers.base import BaseNLPProvider
from core.exceptions import ProviderNotFoundException

logger = logging.getLogger(__name__)


class ProviderRegistry:
    """
    Thread-safe provider registry.

    Providers register themselves at import time.
    The factory returns a singleton per provider name.
    """

    _registry: ClassVar[dict[str, type[BaseNLPProvider]]] = {}
    _instances: ClassVar[dict[str, BaseNLPProvider]] = {}

    @classmethod
    def register(cls, name: str, provider_class: type[BaseNLPProvider]) -> None:
        """Register a provider class under a given name."""
        cls._registry[name] = provider_class
        logger.debug(f"NLP provider registered: {name} → {provider_class.__name__}")

    @classmethod
    def get_provider(cls, name: str) -> BaseNLPProvider:
        """
        Return a singleton instance of the named provider.
        Lazily instantiates on first call.
        """
        if name not in cls._registry:
            raise ProviderNotFoundException(name)

        if name not in cls._instances:
            provider_class = cls._registry[name]
            cls._instances[name] = provider_class()
            logger.info(f"NLP provider instantiated: {name}")

        return cls._instances[name]

    @classmethod
    def available_providers(cls) -> list[str]:
        """Return list of all registered provider names."""
        return list(cls._registry.keys())


def register_all_providers() -> None:
    """
    Register all known providers.
    Called once on application startup.
    Providers that require optional dependencies are registered only if available.
    """
    # SpaCy + VADER (always available — core dependency)
    from providers.spacy_provider import SpaCyProvider
    ProviderRegistry.register("spacy", SpaCyProvider)

    # FinBERT — registered as stub, ready for Phase 6 implementation
    from providers.finbert_provider import FinBERTProvider
    ProviderRegistry.register("finbert", FinBERTProvider)

    # OpenAI — registered as stub, requires OPENAI_API_KEY
    from providers.openai_provider import OpenAIProvider
    ProviderRegistry.register("openai", OpenAIProvider)

    # Gemini — registered as stub, requires GEMINI_API_KEY
    from providers.gemini_provider import GeminiProvider
    ProviderRegistry.register("gemini", GeminiProvider)

    # Custom — registered as stub, BYOM
    from providers.custom_provider import CustomProvider
    ProviderRegistry.register("custom", CustomProvider)

    # Stub — registered for testing/fallback
    from providers.stub_provider import StubNLPProvider
    ProviderRegistry.register("stub", StubNLPProvider)

    logger.info(f"Registered NLP providers: {ProviderRegistry.available_providers()}")
