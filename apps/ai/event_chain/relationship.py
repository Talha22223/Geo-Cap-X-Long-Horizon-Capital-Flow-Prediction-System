"""
Multi-signal Event Relationship Engine.
"""
from dataclasses import dataclass
from typing import Any
from datetime import date
from models.event import ExtractedEvent
from config import settings
import re

@dataclass
class RelationshipScore:
    score: float
    confidence: float
    relationship_type: str
    directionality: str  # "A->B", "B->A", "UNDIRECTED"
    evidence: dict[str, Any]

class RelationshipScorer:
    """
    Determines whether two canonical events have a meaningful relationship and
    identifies a plausible relationship type using multiple signals.
    """
    
    # Define broad categories for mapping to transmission types
    POLICY_CATEGORIES = {"Central Bank Action", "Fiscal Policy", "Regulation", "Policy Rate", "Monetary Policy"}
    MARKET_CATEGORIES = {"Market Shock", "Commodity Price", "Bond Yield", "FX Move", "Market Data"}
    GEOPOLITICAL_CATEGORIES = {"Geopolitical Escalation", "Trade Restriction", "Sanction", "Geopolitical"}
    
    def evaluate(self, event_a: ExtractedEvent, event_b: ExtractedEvent) -> RelationshipScore:
        date_a = event_a.event_date or event_a.created_at.date()
        date_b = event_b.event_date or event_b.created_at.date()
        
        # Determine chronological order
        swapped = False
        if date_a > date_b:
            event_a, event_b = event_b, event_a
            date_a, date_b = date_b, date_a
            swapped = True
            
        time_diff = (date_b - date_a).days
        
        # Signals
        entity_score, shared_entities = self._score_entity_relation(event_a, event_b)
        temporal_score = self._score_temporal_relation(time_diff)
        geo_score = self._score_geographic_relation(event_a, event_b)
        sector_score = self._score_sector_relation(event_a, event_b)
        semantic_score = self._score_semantic_relation(event_a, event_b)
        transmission_score, transmission_type = self._score_transmission_mechanism(event_a, event_b, time_diff)
        
        # Weighted Total Score
        total_score = (
            entity_score * settings.RELATIONSHIP_WEIGHT_ENTITY +
            temporal_score * settings.RELATIONSHIP_WEIGHT_TEMPORAL +
            geo_score * settings.RELATIONSHIP_WEIGHT_GEOGRAPHIC +
            sector_score * settings.RELATIONSHIP_WEIGHT_SECTOR +
            semantic_score * settings.RELATIONSHIP_WEIGHT_SEMANTIC +
            transmission_score * settings.RELATIONSHIP_WEIGHT_TRANSMISSION
        )
        
        # Determine Relationship Type
        relationship_type = "UNKNOWN"
        directionality = "UNDIRECTED"
        
        if total_score >= settings.RELATIONSHIP_THRESHOLD_WEAK:
            if transmission_score > 0.5:
                relationship_type = transmission_type
                directionality = "A->B" if not swapped else "B->A"
            elif entity_score > 0.5 and time_diff <= 7 and geo_score > 0.5:
                relationship_type = "RELATED"
                directionality = "UNDIRECTED"
            elif sector_score > 0.5 and semantic_score > 0.5:
                relationship_type = "CONSEQUENCE"
                directionality = "A->B" if not swapped else "B->A"
            elif total_score >= settings.RELATIONSHIP_THRESHOLD_STRONG:
                relationship_type = "HIGH_CONFIDENCE_RELATION"
                directionality = "A->B" if not swapped else "B->A"
            else:
                relationship_type = "RELATED"
                
        # Confidence calculation
        signals = [entity_score, temporal_score, geo_score, sector_score, semantic_score, transmission_score]
        strong_signals = sum(1 for s in signals if s > 0.5)
        
        base_confidence = event_a.extraction_confidence * event_b.extraction_confidence
        signal_boost = min(0.3, strong_signals * 0.05)
        confidence = min(0.99, base_confidence + signal_boost)
        
        evidence = {
            "entity_score": round(entity_score, 3),
            "temporal_score": round(temporal_score, 3),
            "geo_score": round(geo_score, 3),
            "sector_score": round(sector_score, 3),
            "semantic_score": round(semantic_score, 3),
            "transmission_score": round(transmission_score, 3),
            "shared_entities": shared_entities,
            "time_lag_days": time_diff,
            "chronological": "plausible" if time_diff >= 0 else "reversed",
            "directionality": directionality
        }
        
        return RelationshipScore(
            score=round(total_score, 3),
            confidence=round(confidence, 3),
            relationship_type=relationship_type,
            directionality=directionality,
            evidence=evidence
        )

    def _score_entity_relation(self, event_a: ExtractedEvent, event_b: ExtractedEvent) -> tuple[float, list[str]]:
        entities_a = {ent.entity_value.lower() for ent in event_a.entities}
        entities_b = {ent.entity_value.lower() for ent in event_b.entities}
        shared = entities_a.intersection(entities_b)
        
        if not shared:
            return 0.0, []
            
        overlap_ratio = len(shared) / max(1, min(len(entities_a), len(entities_b)))
        return min(1.0, overlap_ratio * 1.5), list(shared)

    def _score_temporal_relation(self, time_diff: int) -> float:
        if time_diff < 0:
            return 0.0
            
        if time_diff <= settings.RELATIONSHIP_TEMPORAL_WINDOW_DAYS_TRANSMISSION:
            return 1.0 - (time_diff / max(1, settings.RELATIONSHIP_TEMPORAL_WINDOW_DAYS_TRANSMISSION))
        elif time_diff <= settings.RELATIONSHIP_TEMPORAL_WINDOW_DAYS_DEFAULT:
            return 0.5 - (0.5 * (time_diff - settings.RELATIONSHIP_TEMPORAL_WINDOW_DAYS_TRANSMISSION) / 
                          (settings.RELATIONSHIP_TEMPORAL_WINDOW_DAYS_DEFAULT - settings.RELATIONSHIP_TEMPORAL_WINDOW_DAYS_TRANSMISSION))
        return 0.0
        
    def _score_geographic_relation(self, event_a: ExtractedEvent, event_b: ExtractedEvent) -> float:
        countries_a = {ent.entity_value.lower() for ent in event_a.entities if ent.entity_type in ("GPE", "LOCATION", "Country")}
        countries_b = {ent.entity_value.lower() for ent in event_b.entities if ent.entity_type in ("GPE", "LOCATION", "Country")}
        
        if countries_a.intersection(countries_b):
            return 1.0
        return 0.0
        
    def _score_sector_relation(self, event_a: ExtractedEvent, event_b: ExtractedEvent) -> float:
        keywords = ["oil", "energy", "tech", "finance", "banking", "agriculture", "defense", "real estate", "retail", "semiconductor", "automotive"]
        
        text_a = f"{event_a.title} {event_a.summary}".lower()
        text_b = f"{event_b.title} {event_b.summary}".lower()
        
        shared_keywords = sum(1 for k in keywords if k in text_a and k in text_b)
        return min(1.0, shared_keywords * 0.5)

    def _score_semantic_relation(self, event_a: ExtractedEvent, event_b: ExtractedEvent) -> float:
        tokens_a = set(re.findall(r'\b\w+\b', f"{event_a.title} {event_a.summary}".lower()))
        tokens_b = set(re.findall(r'\b\w+\b', f"{event_b.title} {event_b.summary}".lower()))
        
        stopwords = {"the", "and", "to", "of", "in", "for", "on", "a", "is", "with", "as", "by", "that", "at", "from", "has", "it"}
        tokens_a -= stopwords
        tokens_b -= stopwords
        
        intersection = len(tokens_a.intersection(tokens_b))
        union = len(tokens_a.union(tokens_b))
        
        if union == 0:
            return 0.0
        return min(1.0, (intersection / union) * 2.5)
        
    def _score_transmission_mechanism(self, event_a: ExtractedEvent, event_b: ExtractedEvent, time_diff: int) -> tuple[float, str]:
        cat_a = event_a.category or ""
        cat_b = event_b.category or ""
        text_a = f"{event_a.title} {event_a.summary}".lower()
        text_b = f"{event_b.title} {event_b.summary}".lower()
        
        if cat_a in self.MARKET_CATEGORIES and cat_b in self.POLICY_CATEGORIES:
            return 0.9, "POLICY_RESPONSE"
            
        if cat_a in self.POLICY_CATEGORIES and cat_b in self.MARKET_CATEGORIES:
            return 0.9, "MARKET_REACTION"
            
        if ("interest rate" in text_a or "policy rate" in text_a) and ("yield" in text_b or "currency" in text_b or "fx" in text_b or "bond" in text_b):
            return 0.8, "ECONOMIC_TRANSMISSION"
            
        if ("disruption" in text_a or "restriction" in text_a or "tariff" in text_a or "sanction" in text_a):
            if ("supply" in text_b or "shortage" in text_b or "price" in text_b or "trade" in text_b):
                return 0.8, "SUPPLY_CHAIN_IMPACT"
                
        if cat_a in self.GEOPOLITICAL_CATEGORIES and cat_b in self.GEOPOLITICAL_CATEGORIES:
            if time_diff <= 14:
                return 0.7, "ESCALATION"
                
        if "stimulus" in text_a and ("growth" in text_b or "market" in text_b or "rally" in text_b):
            return 0.8, "ECONOMIC_TRANSMISSION"
            
        return 0.0, "UNKNOWN"
