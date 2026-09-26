"""
Event Resolution and Clustering Logic.

Responsible for clustering ExtractedEvent candidates into CanonicalEvents.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.event import ExtractedEvent, CanonicalEvent

logger = logging.getLogger(__name__)

class EventResolver:
    """
    Groups individual extracted event interpretations (from various sources)
    into distinct, canonical, real-world events.
    """
    
    # Weight configuration for multi-signal similarity
    WEIGHTS = {
        "temporal": 0.30,
        "entity": 0.40,
        "semantic": 0.30
    }
    SIMILARITY_THRESHOLD = 0.70

    def __init__(self, db: AsyncSession):
        self.db = db

    async def resolve(self, candidate: ExtractedEvent) -> CanonicalEvent:
        """
        Main entry point. Evaluates a new ExtractedEvent against recent CanonicalEvents.
        Returns the matched CanonicalEvent (updated) or a newly created one.
        """
        # 1. Find recent canonical events in the same category
        time_window = timedelta(days=7)
        target_date = candidate.publication_timestamp or candidate.created_at
        start_date = target_date - time_window
        end_date = target_date + time_window

        stmt = (
            select(CanonicalEvent)
            .where(CanonicalEvent.category == candidate.category)
            .where(CanonicalEvent.event_time_start <= end_date)
            .where(CanonicalEvent.event_time_end >= start_date)
            .options(selectinload(CanonicalEvent.extracted_events))
        )
        res = await self.db.execute(stmt)
        recent_canonicals = res.scalars().all()

        # 2. Score similarity
        best_match: Optional[CanonicalEvent] = None
        best_score = 0.0

        for canonical in recent_canonicals:
            score = self._compute_similarity(candidate, canonical)
            if score > self.SIMILARITY_THRESHOLD and score > best_score:
                best_score = score
                best_match = canonical

        # 3. Resolve
        if best_match:
            logger.info(f"Resolved event {candidate.id} to CanonicalEvent {best_match.id} (score {best_score:.2f})")
            return await self._update_canonical(best_match, candidate)
        else:
            logger.info(f"Created new CanonicalEvent for {candidate.id}")
            return await self._create_canonical(candidate)

    def _compute_similarity(self, candidate: ExtractedEvent, canonical: CanonicalEvent) -> float:
        """
        Compute a transparent multi-signal event similarity score (0.0 to 1.0).
        """
        # 1. Temporal Similarity
        cand_time = candidate.publication_timestamp or candidate.created_at
        can_time = canonical.event_time_start or canonical.created_at
        if cand_time and cand_time.tzinfo is not None:
            cand_time = cand_time.replace(tzinfo=None)
        if can_time and can_time.tzinfo is not None:
            can_time = can_time.replace(tzinfo=None)
        time_diff = abs((cand_time - can_time).total_seconds()) if (cand_time and can_time) else 0.0
        # Max out at 7 days (604800 seconds)
        temporal_sim = max(0.0, 1.0 - (time_diff / 604800.0))

        # 2. Entity Similarity (Jaccard index of countries, regions, sectors, organizations, people)
        cand_entities = self._extract_entity_set(candidate)
        can_entities = self._extract_entity_set(canonical)
        
        if not cand_entities and not can_entities:
            entity_sim = 0.5  # Neutral if neither has entities
        elif not cand_entities or not can_entities:
            entity_sim = 0.0
        else:
            intersection = len(cand_entities.intersection(can_entities))
            union = len(cand_entities.union(can_entities))
            entity_sim = intersection / union if union > 0 else 0.0

        # 3. Semantic / Keyword Similarity (Jaccard index of keywords + title tokens)
        cand_semantic = self._extract_semantic_set(candidate)
        can_semantic = self._extract_semantic_set(canonical)
        
        if not cand_semantic and not can_semantic:
            semantic_sim = 0.5
        elif not cand_semantic or not can_semantic:
            semantic_sim = 0.0
        else:
            intersection = len(cand_semantic.intersection(can_semantic))
            union = len(cand_semantic.union(can_semantic))
            semantic_sim = intersection / union if union > 0 else 0.0

        # Weighted combination
        score = (
            temporal_sim * self.WEIGHTS["temporal"] +
            entity_sim * self.WEIGHTS["entity"] +
            semantic_sim * self.WEIGHTS["semantic"]
        )
        
        return score

    def _extract_entity_set(self, event: ExtractedEvent | CanonicalEvent) -> set[str]:
        entities = set()
        if event.countries: entities.update(event.countries)
        if event.regions: entities.update(event.regions)
        if event.sectors: entities.update(event.sectors)
        if event.organizations: entities.update(event.organizations)
        if event.people: entities.update(event.people)
        return {e.lower() for e in entities}
        
    def _extract_semantic_set(self, event: ExtractedEvent | CanonicalEvent) -> set[str]:
        words = set(event.title.lower().split())
        # Add keywords if it's an ExtractedEvent
        if isinstance(event, ExtractedEvent) and event.keywords:
            words.update([k.lower() for k in event.keywords])
        return words

    async def _create_canonical(self, candidate: ExtractedEvent) -> CanonicalEvent:
        """Create a new canonical event from a candidate."""
        canonical = CanonicalEvent(
            title=candidate.title,
            summary=candidate.summary,
            category=candidate.category,
            severity=candidate.severity,
            confidence=candidate.overall_confidence,
            countries=candidate.countries,
            regions=candidate.regions,
            sectors=candidate.sectors,
            organizations=candidate.organizations,
            people=candidate.people,
            event_time_start=candidate.publication_timestamp or candidate.created_at,
            event_time_end=candidate.publication_timestamp or candidate.created_at,
            supporting_article_count=1,
            independent_source_count=1,
            has_conflicting_evidence=False
        )
        self.db.add(canonical)
        await self.db.flush()
        
        candidate.canonical_event_id = canonical.id
        self.db.add(candidate)
        return canonical

    async def _update_canonical(self, canonical: CanonicalEvent, new_candidate: ExtractedEvent) -> CanonicalEvent:
        """Link a new candidate to an existing canonical event and update metrics."""
        # Link
        new_candidate.canonical_event_id = canonical.id
        self.db.add(new_candidate)
        
        # We must add the new candidate to the list to correctly compute diversity right now
        # since it might not be in canonical.extracted_events yet due to flush/commit boundaries.
        all_candidates = canonical.extracted_events + [new_candidate]
        
        # 1. Update source diversity
        canonical.supporting_article_count = len(all_candidates)
        
        sources = set()
        for c in all_candidates:
            if c.source_provider:
                sources.add(c.source_provider)
            else:
                sources.add(c.data_origin)
                
        canonical.independent_source_count = len(sources)
        
        # 2. Update time range
        event_times = []
        for c in all_candidates:
            if c.publication_timestamp:
                dt = c.publication_timestamp
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                event_times.append(dt)
        if event_times:
            canonical.event_time_start = min(event_times)
            canonical.event_time_end = max(event_times)
            
        # 3. Check for conflicts (e.g. opposing sentiment in the same cluster)
        sentiments = {c.sentiment for c in all_candidates}
        if "BULLISH" in sentiments and "BEARISH" in sentiments:
            canonical.has_conflicting_evidence = True
            canonical.conflict_details = "Conflicting sentiment across sources."
            
        # 4. Update Confidence logic
        # Baseline confidence is the max extraction confidence.
        # Diversity bonus: +5% for each independent source up to 20% bonus.
        # But if there are conflicts, cap it or penalize it.
        base_confidence = max(c.overall_confidence for c in all_candidates)
        diversity_bonus = min(0.20, (canonical.independent_source_count - 1) * 0.05)
        
        new_confidence = base_confidence + diversity_bonus
        if canonical.has_conflicting_evidence:
            new_confidence *= 0.8  # 20% penalty for unresolved ambiguity
            
        canonical.confidence = min(1.0, round(new_confidence, 3))
        
        # 5. Expand entities with union
        canonical.countries = list(self._extract_entity_set(canonical).union(self._extract_entity_set(new_candidate))) or None
        
        self.db.add(canonical)
        await self.db.flush()
        return canonical
