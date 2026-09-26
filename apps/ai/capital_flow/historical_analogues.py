"""
Real Historical Analogue Engine (V7.1 Multi-Horizon Engine).
Compares current events against structured historical records using multi-attribute similarity matching.
Strictly avoids keyword-only matching and returns INSUFFICIENT_HISTORICAL_DATA when evidence is missing.
"""
from __future__ import annotations
import logging
from typing import Any
from seed_data.historical_events import HISTORICAL_EVENTS
from capital_flow.contracts import EventEvidenceInput, HistoricalEvidenceInput, EvidenceState

logger = logging.getLogger(__name__)


class HistoricalAnalogueEngine:
    """
    Genuine Historical Comparison Engine.
    Evaluates historical events based on Category, Sector, Region/Country, Severity, and Sentiment.
    """

    MIN_SIMILARITY_THRESHOLD = 0.45

    @classmethod
    def find_analogues(
        cls,
        event: EventEvidenceInput,
        asset_class: str | None = None,
        db_historical_events: list[dict[str, Any]] | None = None,
        limit: int = 5
    ) -> HistoricalEvidenceInput:
        """
        Find comparable historical event analogues.
        """
        pool = db_historical_events if db_historical_events is not None else HISTORICAL_EVENTS

        if not pool:
            return HistoricalEvidenceInput(
                analogue_count=0,
                top_similarity_score=0.0,
                matched_analogues=[],
                state=EvidenceState.INSUFFICIENT
            )

        candidates: list[dict[str, Any]] = []

        for h_ev in pool:
            sim_score, matching_attrs = cls._calculate_similarity(event, h_ev, asset_class)

            if sim_score >= cls.MIN_SIMILARITY_THRESHOLD:
                candidates.append({
                    "title": h_ev.get("title"),
                    "date": str(h_ev.get("event_date") or h_ev.get("published_at") or "Unknown"),
                    "similarity_score": round(sim_score, 4),
                    "similarity_method": "MULTIDIMENSIONAL_ATTRIBUTE_MATCHING",
                    "matching_attributes": matching_attrs,
                    "observed_outcome": h_ev.get("evidence") or f"Expected direction: {h_ev.get('expected_direction', 'UNKNOWN')}",
                    "source": h_ev.get("source", "Historical Archive")
                })

        # Sort candidates descending by similarity score
        candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
        top_candidates = candidates[:limit]

        if not top_candidates:
            return HistoricalEvidenceInput(
                analogue_count=0,
                top_similarity_score=0.0,
                matched_analogues=[],
                state=EvidenceState.INSUFFICIENT
            )

        top_score = top_candidates[0]["similarity_score"]
        state = EvidenceState.AVAILABLE if len(top_candidates) >= 1 else EvidenceState.INSUFFICIENT

        return HistoricalEvidenceInput(
            analogue_count=len(top_candidates),
            top_similarity_score=top_score,
            matched_analogues=top_candidates,
            state=state
        )

    @classmethod
    def _calculate_similarity(
        cls,
        event: EventEvidenceInput,
        h_ev: dict[str, Any],
        asset_class: str | None
    ) -> tuple[float, list[str]]:
        """
        Calculate weighted composite similarity score.
        Category (0.35) + Sector (0.20) + Region/Country (0.15) + Severity (0.15) + Sentiment (0.15)
        """
        matching_attrs: list[str] = []
        score = 0.0

        # 1. Category (35%)
        h_cat = str(h_ev.get("category", "")).upper()
        e_cat = str(event.category).upper()
        if h_cat == e_cat and h_cat != "":
            score += 0.35
            matching_attrs.append(f"CATEGORY_MATCH: {h_cat}")

        # 2. Sector (20%)
        h_sector = str(h_ev.get("sector", "")).lower()
        e_sectors = [s.lower() for s in event.sectors]
        if h_sector and any(h_sector == s for s in e_sectors):
            score += 0.20
            matching_attrs.append(f"SECTOR_MATCH: {h_sector.title()}")

        # 3. Region / Country (15%)
        h_country = str(h_ev.get("country", "")).lower()
        h_region = str(h_ev.get("region", "")).lower()
        e_countries = [c.lower() for c in event.countries]
        e_regions = [r.lower() for r in event.regions]

        if h_country and any(h_country == c for c in e_countries):
            score += 0.15
            matching_attrs.append(f"COUNTRY_MATCH: {h_country.title()}")
        elif h_region and any(h_region in r or r in h_region for r in e_regions):
            score += 0.10
            matching_attrs.append(f"REGION_MATCH: {h_region.title()}")

        # 4. Severity Proximity (15%)
        h_sev = float(h_ev.get("severity", 0.5))
        e_sev = float(event.severity)
        sev_diff = abs(h_sev - e_sev)
        sev_sim = max(0.0, 1.0 - (sev_diff / 0.5))
        score += 0.15 * sev_sim
        if sev_diff <= 0.15:
            matching_attrs.append(f"SEVERITY_PROXIMITY: delta={sev_diff:.2f}")

        # 5. Sentiment / Direction (15%)
        h_dir = str(h_ev.get("expected_direction", "")).upper()
        e_sent = str(event.sentiment).upper()
        if (e_sent == "BULLISH" and h_dir == "INFLOW") or (e_sent == "BEARISH" and h_dir == "OUTFLOW"):
            score += 0.15
            matching_attrs.append(f"DIRECTION_ALIGNMENT: {h_dir}")

        return min(1.0, score), matching_attrs
