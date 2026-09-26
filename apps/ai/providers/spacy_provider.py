"""
SpaCy + VADER NLP Provider.

Phase 5 implementation of BaseNLPProvider.
Uses spaCy en_core_web_sm for NER and VADER for financial sentiment.
All logic is encapsulated here — business layers never import spaCy directly.
"""
from __future__ import annotations

import logging
import re
from datetime import date
from typing import Any

from providers.base import (
    BaseNLPProvider,
    ClassificationResult,
    EntityExtractionResult,
    KeywordResult,
    SentimentResult,
)
from config import settings

logger = logging.getLogger(__name__)

# ── Country / Region / Sector / Commodity mappings ───────────────────────────
# These keyword dictionaries are used to supplement spaCy's GPE detection.

COUNTRY_KEYWORDS: dict[str, str] = {
    "united states": "United States", "usa": "United States", "u.s.": "United States",
    "us ": "United States", "american": "United States",
    "china": "China", "chinese": "China", "prc": "China", "beijing": "China",
    "europe": "European Union", "eu": "European Union", "eurozone": "European Union",
    "germany": "Germany", "german": "Germany",
    "japan": "Japan", "japanese": "Japan", "boj": "Japan",
    "united kingdom": "United Kingdom", "uk": "United Kingdom", "britain": "United Kingdom",
    "russia": "Russia", "russian": "Russia",
    "ukraine": "Ukraine", "ukrainian": "Ukraine",
    "saudi arabia": "Saudi Arabia", "saudi": "Saudi Arabia",
    "canada": "Canada", "canadian": "Canada",
    "australia": "Australia", "australian": "Australia",
    "india": "India", "indian": "India",
    "brazil": "Brazil", "brazilian": "Brazil",
    "israel": "Israel", "israeli": "Israel",
    "taiwan": "Taiwan",
    "south korea": "South Korea", "korea": "South Korea",
    "switzerland": "Switzerland", "swiss": "Switzerland",
    "france": "France", "french": "France",
    "italy": "Italy", "italian": "Italy",
}

CURRENCY_KEYWORDS: dict[str, str] = {
    "usd": "USD", "dollar": "USD", "$": "USD",
    "eur": "EUR", "euro": "EUR", "€": "EUR",
    "gbp": "GBP", "pound": "GBP", "sterling": "GBP",
    "jpy": "JPY", "yen": "JPY",
    "cny": "CNY", "yuan": "CNY", "renminbi": "CNY",
    "chf": "CHF", "franc": "CHF",
    "cad": "CAD",
    "aud": "AUD",
    "inr": "INR", "rupee": "INR",
    "brl": "BRL", "real": "BRL",
    "rub": "RUB", "ruble": "RUB",
}

COMMODITY_KEYWORDS: dict[str, str] = {
    "oil": "Crude Oil", "brent": "Brent Crude", "crude": "Crude Oil",
    "wti": "WTI Crude", "natural gas": "Natural Gas", "lng": "LNG",
    "gold": "Gold", "silver": "Silver", "copper": "Copper",
    "wheat": "Wheat", "corn": "Corn", "soybeans": "Soybeans",
    "coal": "Coal", "iron ore": "Iron Ore", "steel": "Steel",
    "lithium": "Lithium", "nickel": "Nickel", "palladium": "Palladium",
}

SECTOR_KEYWORDS: dict[str, str] = {
    "energy": "Energy", "oil and gas": "Energy", "petroleum": "Energy",
    "technology": "Technology", "tech": "Technology", "semiconductor": "Technology",
    "finance": "Financial Services", "banking": "Financial Services", "bank": "Financial Services",
    "healthcare": "Healthcare", "pharmaceutical": "Healthcare", "biotech": "Healthcare",
    "manufacturing": "Manufacturing", "industrial": "Manufacturing",
    "real estate": "Real Estate", "property": "Real Estate",
    "agriculture": "Agriculture", "farming": "Agriculture",
    "defense": "Defense", "military": "Defense",
    "telecommunications": "Telecommunications", "telecom": "Telecommunications",
    "utilities": "Utilities", "power": "Utilities", "electricity": "Utilities",
    "retail": "Consumer Discretionary", "consumer": "Consumer Discretionary",
    "transportation": "Transportation", "logistics": "Transportation",
    "mining": "Materials", "metals": "Materials",
}

ASSET_CLASS_KEYWORDS: dict[str, str] = {
    "bond": "BOND", "treasury": "BOND", "yield": "BOND", "fixed income": "BOND",
    "equity": "EQUITY", "stock": "EQUITY", "share": "EQUITY", "ipo": "EQUITY",
    "forex": "CURRENCY", "fx": "CURRENCY", "exchange rate": "CURRENCY",
    "commodity": "COMMODITY", "futures": "COMMODITY",
    "crypto": "CRYPTO", "bitcoin": "CRYPTO", "ethereum": "CRYPTO",
    "real estate": "REAL_ESTATE", "reit": "REAL_ESTATE",
    "etf": "ETF", "fund": "FUND", "hedge fund": "FUND",
}


class SpaCyProvider(BaseNLPProvider):
    """
    spaCy en_core_web_sm + VADER sentiment provider.

    Loaded lazily on first use to avoid startup overhead.
    """

    _nlp: Any = None          # spaCy Language model
    _vader: Any = None         # VADER SentimentIntensityAnalyzer

    def _load_models(self) -> None:
        """Load spaCy and VADER on first use (lazy load)."""
        if self._nlp is None:
            import spacy
            try:
                self._nlp = spacy.load(settings.SPACY_MODEL)
                logger.info(f"spaCy model loaded: {settings.SPACY_MODEL}")
            except OSError:
                logger.warning(
                    f"spaCy model '{settings.SPACY_MODEL}' not found. "
                    "Run: python -m spacy download en_core_web_sm"
                )
                self._nlp = spacy.blank("en")
                self._nlp.add_pipe("sentencizer")

        if self._vader is None:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            self._vader = SentimentIntensityAnalyzer()
            logger.info("VADER SentimentIntensityAnalyzer loaded.")

    @property
    def provider_name(self) -> str:
        return "SpaCyProvider"

    @property
    def model_version(self) -> str:
        return f"{settings.SPACY_MODEL}+vader-3.3.2"

    async def extract_entities(self, text: str) -> EntityExtractionResult:
        """Extract 15 entity fields using spaCy NER + keyword dictionaries."""
        self._load_models()
        text_lower = text.lower()
        doc = self._nlp(text)

        # spaCy NER entities
        organizations: list[str] = []
        people: list[str] = []
        spacy_gpe: list[str] = []

        for ent in doc.ents:
            if ent.label_ == "ORG":
                org = ent.text.strip()
                if len(org) > 2:
                    organizations.append(org)
            elif ent.label_ == "PERSON":
                person = ent.text.strip()
                if len(person) > 2:
                    people.append(person)
            elif ent.label_ == "GPE":
                spacy_gpe.append(ent.text.strip())

        # Keyword-based enrichment
        countries = list({v for k, v in COUNTRY_KEYWORDS.items() if k in text_lower})
        countries.extend([g for g in spacy_gpe if g not in countries])

        currencies = list({v for k, v in CURRENCY_KEYWORDS.items() if k in text_lower})
        # Infer currencies from countries
        for country in countries:
            inferred = self._infer_currencies_from_country(country)
            if inferred and inferred not in currencies:
                currencies.append(inferred)

        commodities = list({v for k, v in COMMODITY_KEYWORDS.items() if k in text_lower})
        sectors = list({v for k, v in SECTOR_KEYWORDS.items() if k in text_lower})
        asset_classes = list({v for k, v in ASSET_CLASS_KEYWORDS.items() if k in text_lower})

        # Region inference from countries
        regions = self._infer_regions(countries)

        # Industry (simple heuristic — extracted from sector context)
        industries = self._extract_industries(text_lower, sectors)

        # Event dates from spaCy
        event_dates = self._extract_dates(doc)

        # Keywords
        keyword_result = await self.generate_keywords(text)

        # Confidence: based on entity richness
        entity_count = sum([
            len(countries), len(currencies), len(organizations),
            len(commodities), len(sectors),
        ])
        confidence = min(0.95, 0.40 + (entity_count * 0.06))

        return EntityExtractionResult(
            countries=list(set(countries))[:10],
            regions=list(set(regions))[:5],
            sectors=list(set(sectors))[:5],
            industries=list(set(industries))[:5],
            companies=list(set(organizations))[:10],
            commodities=list(set(commodities))[:5],
            currencies=list(set(currencies))[:5],
            organizations=list(set(organizations))[:10],
            people=list(set(people))[:10],
            asset_classes=list(set(asset_classes))[:5],
            event_dates=event_dates[:5],
            keywords=keyword_result.keywords[:20],
            extraction_confidence=round(confidence, 3),
        )

    async def classify_event(self, text: str) -> ClassificationResult:
        """Classify event into 19 domain categories using keyword rules."""
        text_lower = text.lower()

        CATEGORY_RULES: dict[str, list[str]] = {
            "MONETARY_POLICY": ["interest rate", "rate hike", "rate cut", "fed", "ecb", "boj", "boe",
                                  "central bank", "quantitative easing", "qe", "taper", "yield curve control", "ycc",
                                  "federal reserve", "fomc", "monetary policy"],
            "FISCAL_POLICY": ["budget", "deficit", "stimulus", "tax", "fiscal", "government spending",
                               "debt ceiling", "treasury", "austerity", "spending bill"],
            "INFLATION": ["inflation", "cpi", "pce", "consumer price", "price index", "hyperinflation",
                           "deflation", "core inflation", "disinflation", "price pressure"],
            "EMPLOYMENT": ["unemployment", "jobs report", "nonfarm payroll", "nfp", "labor market",
                            "hiring", "layoffs", "job creation", "wages", "employment"],
            "INTEREST_RATES": ["interest rate", "rate decision", "basis points", "bps", "fed funds",
                                "overnight rate", "lending rate", "benchmark rate"],
            "GEOPOLITICAL": ["war", "conflict", "sanction", "nato", "alliance", "coup", "protest",
                              "election", "diplomat", "treaty", "geopolit"],
            "MILITARY": ["military", "troops", "invasion", "missile", "strike", "warfare", "army",
                          "navy", "air force", "weapon", "defense spending", "bomb"],
            "ENERGY": ["oil", "gas", "opec", "energy", "crude", "lng", "pipeline", "refinery",
                        "renewable", "solar", "wind", "nuclear", "coal"],
            "TRADE": ["tariff", "trade war", "export", "import", "trade deal", "wto", "supply chain",
                       "embargo", "quota", "trade balance", "current account"],
            "SUPPLY_CHAIN": ["supply chain", "shortage", "disruption", "logistics", "port", "shipping",
                              "container", "freight", "inventory", "backlog"],
            "TECHNOLOGY": ["semiconductor", "chip", "ai ", "artificial intelligence", "technology",
                             "cyber", "hack", "software", "hardware", "cloud", "data center"],
            "HEALTHCARE": ["covid", "pandemic", "vaccine", "drug", "pharmaceutical", "fda", "ema",
                             "health", "biotech", "clinical trial", "hospital"],
            "MANUFACTURING": ["manufacturing", "pmi", "industrial production", "factory", "output",
                               "auto", "automobile", "production"],
            "POLITICAL": ["election", "government", "president", "prime minister", "parliament",
                           "vote", "party", "political", "minister", "resign", "impeach"],
            "NATURAL_DISASTER": ["earthquake", "hurricane", "flood", "wildfire", "tsunami", "drought",
                                   "storm", "disaster", "climate"],
            "REGULATORY": ["regulation", "law", "rule", "compliance", "sec", "cftc", "antitrust",
                             "ban", "fine", "penalty", "lawsuit", "legislation"],
            "CORPORATE": ["earnings", "revenue", "profit", "loss", "acquisition", "merger", "ipo",
                           "dividend", "bankruptcy", "restructuring", "ceo", "quarterly results"],
            "MARKET": ["stock market", "bull market", "bear market", "rally", "crash", "volatility",
                        "vix", "s&p", "nasdaq", "dow", "equity market", "sell-off", "correction"],
            "ECONOMIC": ["gdp", "growth", "recession", "economic", "economy", "output", "productivity",
                          "pmi", "retail sales", "housing"],
        }

        scores: dict[str, int] = {}
        for category, keywords in CATEGORY_RULES.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[category] = score

        if not scores:
            return ClassificationResult(
                primary_category="ECONOMIC",
                secondary_categories=[],
                classification_confidence=0.40,
            )

        sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        primary = sorted_cats[0][0]
        secondary = [c for c, _ in sorted_cats[1:4]]

        # Confidence: based on score strength
        max_score = sorted_cats[0][1]
        confidence = min(0.95, 0.50 + (max_score * 0.08))

        return ClassificationResult(
            primary_category=primary,
            secondary_categories=secondary,
            classification_confidence=round(confidence, 3),
        )

    async def calculate_sentiment(self, text: str) -> SentimentResult:
        """Calculate financial sentiment using VADER compound score."""
        self._load_models()
        scores = self._vader.polarity_scores(text)
        compound = scores["compound"]   # -1.0 to +1.0

        # Map compound to financial sentiment
        if compound >= 0.05:
            sentiment = "BULLISH"
        elif compound <= -0.05:
            sentiment = "BEARISH"
        else:
            sentiment = "NEUTRAL"

        # Confidence: |compound| indicates strength of signal
        confidence = min(0.95, 0.50 + abs(compound) * 0.45)

        return SentimentResult(
            sentiment=sentiment,
            polarity=round(compound, 4),
            subjectivity=round(scores.get("pos", 0) + scores.get("neg", 0), 4),
            classification_confidence=round(confidence, 3),
        )

    async def calculate_confidence(self, text: str, context: dict) -> float:
        """
        Overall confidence based on text richness and context signals.
        """
        base = 0.50
        factors: list[float] = []

        # Text length factor (longer = more signal)
        text_len = len(text)
        if text_len > 500:
            factors.append(0.10)
        elif text_len > 200:
            factors.append(0.05)
        else:
            factors.append(-0.05)

        # Entity count factor
        entity_count = context.get("entity_count", 0)
        factors.append(min(0.20, entity_count * 0.03))

        # Source reliability factor
        source_reliability = context.get("source_reliability", 0.7)
        factors.append((source_reliability - 0.5) * 0.20)

        confidence = base + sum(factors)
        return round(max(0.10, min(0.95, confidence)), 3)

    async def generate_keywords(self, text: str) -> KeywordResult:
        """Extract keywords using spaCy noun chunks + named entities."""
        self._load_models()
        doc = self._nlp(text)

        keywords: list[str] = []
        key_phrases: list[str] = []

        # Named entity keywords
        for ent in doc.ents:
            if ent.label_ in ("ORG", "GPE", "PERSON", "PRODUCT", "EVENT"):
                keywords.append(ent.text.strip().lower())

        # Noun chunks as key phrases
        try:
            for chunk in doc.noun_chunks:
                if len(chunk.text.split()) >= 2 and len(chunk.text) < 50:
                    key_phrases.append(chunk.text.strip().lower())
        except ValueError:
            # Fallback when dependency parsing is not available
            pass

        # Significant single nouns
        for token in doc:
            if (
                token.pos_ in ("NOUN", "PROPN")
                and not token.is_stop
                and not token.is_punct
                and len(token.text) > 3
            ):
                keywords.append(token.text.lower())

        # Deduplicate preserving order
        seen: set[str] = set()
        unique_kw = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique_kw.append(kw)

        return KeywordResult(
            keywords=unique_kw[:20],
            key_phrases=list(dict.fromkeys(key_phrases))[:10],
        )

    async def generate_summary(self, text: str) -> str:
        """
        Generate a concise, explainable summary using spaCy's sentence segmentation.
        Takes the first 2 sentences.
        """
        self._load_models()
        doc = self._nlp(text)
        sentences = list(doc.sents)
        if not sentences:
            return text[:200] + "..."
        summary = " ".join([sent.text.strip() for sent in sentences[:2]])
        return summary
        
    async def assess_severity(self, text: str, context: dict) -> float:
        """
        Assess severity based on category and entity richness.
        """
        category = context.get("category", "ECONOMIC")
        entity_count = context.get("entity_count", 0)
        countries_count = context.get("countries_count", 0)
        
        # Base severity by category
        HIGH_SEVERITY_CATS = {"MILITARY", "GEOPOLITICAL", "NATURAL_DISASTER", "MARKET"}
        MED_SEVERITY_CATS = {"MONETARY_POLICY", "TRADE", "INFLATION", "FISCAL_POLICY"}
        
        if category in HIGH_SEVERITY_CATS:
            base = 0.6
        elif category in MED_SEVERITY_CATS:
            base = 0.4
        else:
            base = 0.2
            
        # Geographic scope modifier
        geo_mod = min(0.3, countries_count * 0.1)
        
        # Entity modifier
        ent_mod = min(0.2, entity_count * 0.02)
        
        severity = base + geo_mod + ent_mod
        return round(min(1.0, severity), 3)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _infer_regions(self, countries: list[str]) -> list[str]:
        """Map countries to geographic regions."""
        COUNTRY_TO_REGION: dict[str, str] = {
            "United States": "North America", "Canada": "North America",
            "United Kingdom": "Europe", "Germany": "Europe", "France": "Europe",
            "Italy": "Europe", "Switzerland": "Europe", "European Union": "Europe",
            "Russia": "Europe/Asia", "Ukraine": "Europe",
            "Japan": "Asia Pacific", "China": "Asia Pacific", "South Korea": "Asia Pacific",
            "Australia": "Asia Pacific", "Taiwan": "Asia Pacific", "India": "Asia Pacific",
            "Saudi Arabia": "Middle East", "Israel": "Middle East",
            "Brazil": "Latin America",
        }
        regions: list[str] = []
        for country in countries:
            if region := COUNTRY_TO_REGION.get(country):
                regions.append(region)
        return list(set(regions))

    def _infer_currencies_from_country(self, country: str) -> str | None:
        """Map country to its primary currency."""
        COUNTRY_TO_CURRENCY: dict[str, str] = {
            "United States": "USD",
            "Germany": "EUR",
            "France": "EUR",
            "Italy": "EUR",
            "European Union": "EUR",
            "United Kingdom": "GBP",
            "Japan": "JPY",
            "China": "CNY",
            "Switzerland": "CHF",
            "Canada": "CAD",
            "Australia": "AUD",
            "India": "INR",
            "Brazil": "BRL",
            "Russia": "RUB",
        }
        return COUNTRY_TO_CURRENCY.get(country)

    def _extract_industries(self, text_lower: str, sectors: list[str]) -> list[str]:
        """Heuristic industry extraction from sector context."""
        INDUSTRY_MAP: dict[str, list[str]] = {
            "Energy": ["Oil & Gas Exploration", "Refining", "Pipeline", "LNG"],
            "Technology": ["Semiconductors", "Software", "Cloud Computing", "AI"],
            "Financial Services": ["Commercial Banking", "Investment Banking", "Asset Management"],
            "Healthcare": ["Pharmaceuticals", "Biotechnology", "Medical Devices"],
            "Manufacturing": ["Automotive", "Aerospace", "Electronics"],
        }
        industries: list[str] = []
        for sector in sectors:
            if sector in INDUSTRY_MAP:
                industries.extend(INDUSTRY_MAP[sector][:2])
        return industries

    def _extract_dates(self, doc: Any) -> list[date]:
        """Extract date entities from spaCy doc."""
        from dateutil import parser as dateparser
        dates: list[date] = []
        for ent in doc.ents:
            if ent.label_ == "DATE":
                try:
                    parsed = dateparser.parse(ent.text, fuzzy=True)
                    if parsed:
                        dates.append(parsed.date())
                except (ValueError, OverflowError):
                    pass
        return dates
