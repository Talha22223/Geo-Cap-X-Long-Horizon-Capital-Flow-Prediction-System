"""
Gemini NLP Provider.

Uses the Gemini API to extract entities, classify events, and calculate sentiment.
"""
from __future__ import annotations
import json
import logging
from datetime import date
import httpx
from config import settings
from providers.base import (
    BaseNLPProvider,
    ClassificationResult,
    EntityExtractionResult,
    KeywordResult,
    SentimentResult,
)

logger = logging.getLogger(__name__)


class GeminiProvider(BaseNLPProvider):
    @property
    def provider_name(self) -> str:
        return "GeminiProvider"

    @property
    def model_version(self) -> str:
        return "gemini-1.5-flash"

    async def _call_gemini(self, prompt: str) -> dict | None:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_version}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(text_response.strip())
                else:
                    logger.warning(f"Gemini API returned error {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")

        return None

    async def extract_entities(self, text: str) -> EntityExtractionResult:
        prompt = (
            "Analyze the following financial text and extract structured entities. "
            "Respond ONLY with a JSON object matching this schema: "
            "{\n"
            "  \"countries\": [\"list of countries mentioned\"],\n"
            "  \"regions\": [\"list of regions mentioned\"],\n"
            "  \"sectors\": [\"list of economic sectors mentioned\"],\n"
            "  \"industries\": [\"list of specific industries mentioned\"],\n"
            "  \"companies\": [\"list of companies mentioned\"],\n"
            "  \"commodities\": [\"list of commodities mentioned\"],\n"
            "  \"currencies\": [\"list of currencies mentioned\"],\n"
            "  \"organizations\": [\"list of organizations mentioned\"],\n"
            "  \"people\": [\"list of people mentioned\"],\n"
            "  \"asset_classes\": [\"list of asset classes mentioned\"],\n"
            "  \"keywords\": [\"list of general keywords\"],\n"
            "  \"extraction_confidence\": 0.95\n"
            "}\n"
            f"Text to analyze: {text}"
        )

        res = await self._call_gemini(prompt)
        if res:
            try:
                return EntityExtractionResult(
                    countries=res.get("countries", []),
                    regions=res.get("regions", []),
                    sectors=res.get("sectors", []),
                    industries=res.get("industries", []),
                    companies=res.get("companies", []),
                    commodities=res.get("commodities", []),
                    currencies=res.get("currencies", []),
                    organizations=res.get("organizations", []),
                    people=res.get("people", []),
                    asset_classes=res.get("asset_classes", []),
                    keywords=res.get("keywords", []),
                    extraction_confidence=res.get("extraction_confidence", 0.9),
                )
            except Exception as e:
                logger.error(f"Failed to parse Gemini entities response: {e}")

        return self._mock_extraction(text)

    async def classify_event(self, text: str) -> ClassificationResult:
        prompt = (
            "Classify the following financial text into one of these categories: "
            "ECONOMIC, POLITICAL, MILITARY, ENERGY, TECHNOLOGY, HEALTHCARE, MANUFACTURING, TRADE, "
            "MONETARY_POLICY, FISCAL_POLICY, SUPPLY_CHAIN, INFLATION, EMPLOYMENT, INTEREST_RATES, "
            "NATURAL_DISASTER, REGULATORY, GEOPOLITICAL, CORPORATE, MARKET. "
            "Respond ONLY with a JSON object matching this schema: "
            "{\n"
            "  \"primary_category\": \"one of the categories above\",\n"
            "  \"secondary_categories\": [\"optional other matching categories\"],\n"
            "  \"classification_confidence\": 0.95\n"
            "}\n"
            f"Text to classify: {text}"
        )

        res = await self._call_gemini(prompt)
        if res:
            try:
                return ClassificationResult(
                    primary_category=res.get("primary_category", "ECONOMIC"),
                    secondary_categories=res.get("secondary_categories", []),
                    classification_confidence=res.get("classification_confidence", 0.9),
                )
            except Exception as e:
                logger.error(f"Failed to parse Gemini classification response: {e}")

        return self._mock_classification(text)

    async def calculate_sentiment(self, text: str) -> SentimentResult:
        prompt = (
            "Determine the financial sentiment of the following text: BULLISH, BEARISH, or NEUTRAL. "
            "Provide a polarity score (-1.0 to +1.0) and a subjectivity score (0.0 to 1.0). "
            "Respond ONLY with a JSON object matching this schema: "
            "{\n"
            "  \"sentiment\": \"BULLISH | BEARISH | NEUTRAL\",\n"
            "  \"polarity\": 0.75,\n"
            "  \"subjectivity\": 0.5,\n"
            "  \"classification_confidence\": 0.95\n"
            "}\n"
            f"Text to analyze: {text}"
        )

        res = await self._call_gemini(prompt)
        if res:
            try:
                return SentimentResult(
                    sentiment=res.get("sentiment", "NEUTRAL"),
                    polarity=res.get("polarity", 0.0),
                    subjectivity=res.get("subjectivity", 0.0),
                    classification_confidence=res.get("classification_confidence", 0.9),
                )
            except Exception as e:
                logger.error(f"Failed to parse Gemini sentiment response: {e}")

        return self._mock_sentiment(text)

    async def calculate_confidence(self, text: str, context: dict) -> float:
        return 0.9

    async def generate_keywords(self, text: str) -> KeywordResult:
        res = await self.extract_entities(text)
        return KeywordResult(keywords=res.keywords, key_phrases=res.keywords[:3])

    def _mock_extraction(self, text: str) -> EntityExtractionResult:
        text_lower = text.lower()
        countries = []
        regions = []
        sectors = []
        currencies = []

        if "china" in text_lower or "chinese" in text_lower:
            countries.append("China")
            regions.append("Asia")
            currencies.append("CNH")
        if "europe" in text_lower or "euro" in text_lower:
            regions.append("Europe")
            if "germany" in text_lower:
                countries.append("Germany")
            currencies.append("EUR")
        if "us " in text_lower or "united states" in text_lower or "fed " in text_lower or "dollar" in text_lower:
            countries.append("United States")
            regions.append("Americas")
            currencies.append("USD")

        if "tech" in text_lower or "semiconductor" in text_lower:
            sectors.append("Technology")
        if "energy" in text_lower or "oil" in text_lower or "gas" in text_lower:
            sectors.append("Energy")

        return EntityExtractionResult(
            countries=countries or ["United States"],
            regions=regions or ["Americas"],
            sectors=sectors or ["Technology"],
            currencies=currencies or ["USD"],
            extraction_confidence=0.85,
        )

    def _mock_classification(self, text: str) -> ClassificationResult:
        text_lower = text.lower()
        cat = "ECONOMIC"
        if "inflation" in text_lower or "cpi" in text_lower:
            cat = "INFLATION"
        elif "fed" in text_lower or "rates" in text_lower or "interest" in text_lower:
            cat = "INTEREST_RATES"
        elif "tariff" in text_lower or "trade" in text_lower:
            cat = "TRADE"
        elif "war" in text_lower or "military" in text_lower:
            cat = "MILITARY"

        return ClassificationResult(
            primary_category=cat,
            classification_confidence=0.9,
        )

    def _mock_sentiment(self, text: str) -> SentimentResult:
        text_lower = text.lower()
        if any(w in text_lower for w in ["grow", "boost", "inflow", "bullish", "strengthen", "positive"]):
            return SentimentResult(sentiment="BULLISH", polarity=0.6, classification_confidence=0.85)
        if any(w in text_lower for w in ["decline", "drop", "outflow", "bearish", "weak", "negative", "crisis"]):
            return SentimentResult(sentiment="BEARISH", polarity=-0.6, classification_confidence=0.85)
        return SentimentResult(sentiment="NEUTRAL", polarity=0.0, classification_confidence=0.85)
