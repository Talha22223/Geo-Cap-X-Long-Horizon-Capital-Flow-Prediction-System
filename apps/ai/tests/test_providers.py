"""
Tests for NLP Provider Registry and SpaCy/VADER NLP Provider.
"""
import pytest
from providers.registry import ProviderRegistry, register_all_providers
from providers.spacy_provider import SpaCyProvider
from core.exceptions import ProviderNotFoundException


def test_registry_registration():
    register_all_providers()
    assert "spacy" in ProviderRegistry.available_providers()
    assert "finbert" in ProviderRegistry.available_providers()
    assert "openai" in ProviderRegistry.available_providers()


def test_registry_not_found():
    with pytest.raises(ProviderNotFoundException):
        ProviderRegistry.get_provider("invalid_provider_name")


@pytest.mark.asyncio
async def test_spacy_provider_extraction():
    provider = ProviderRegistry.get_provider("spacy")
    assert isinstance(provider, SpaCyProvider)
    
    text = "Federal Reserve raised interest rates by 75 basis points in the United States to combat inflation on crude oil imports."
    res = await provider.extract_entities(text)
    
    assert "United States" in res.countries
    assert "North America" in res.regions
    assert "Crude Oil" in res.commodities
    assert "USD" in res.currencies
    assert res.extraction_confidence > 0.3


@pytest.mark.asyncio
async def test_spacy_provider_sentiment():
    provider = ProviderRegistry.get_provider("spacy")
    
    text_bull = "The economy is growing rapidly, profits are soaring, and stock markets are hitting record highs."
    res_bull = await provider.calculate_sentiment(text_bull)
    assert res_bull.sentiment == "BULLISH"
    assert res_bull.polarity > 0.0

    text_bear = "The sudden bankruptcy and default of the bank triggered panic and severe market crashes."
    res_bear = await provider.calculate_sentiment(text_bear)
    assert res_bear.sentiment == "BEARISH"
    assert res_bear.polarity < 0.0


@pytest.mark.asyncio
async def test_spacy_provider_classification():
    provider = ProviderRegistry.get_provider("spacy")
    
    text = "The FOMC decided to cut the benchmark interest rate by 50 basis points to support borrowing."
    res = await provider.classify_event(text)
    assert res.primary_category == "MONETARY_POLICY"
