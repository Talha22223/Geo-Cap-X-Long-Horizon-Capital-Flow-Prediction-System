"""
Multi-Strategy Event Deduplicator.
"""
from __future__ import annotations
import hashlib
from difflib import SequenceMatcher
from datetime import timedelta
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.event import RawEvent, ExtractedEvent
from config import settings

logger = logging.getLogger(__name__)


class MultiStrategyDeduplicator:
    """
    Implements 6 deduplication strategies to identify duplicate events.
    """

    @staticmethod
    def calculate_hash(text: str) -> str:
        """Strategy 1: SHA-256 Hash Matching."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @staticmethod
    def calculate_title_similarity(title_a: str, title_b: str) -> float:
        """Strategy 2: Title Similarity (SequenceMatcher)."""
        if not title_a or not title_b:
            return 0.0
        return SequenceMatcher(None, title_a.lower(), title_b.lower()).ratio()

    @classmethod
    async def is_duplicate(
        self,
        db: AsyncSession,
        title: str,
        body: str,
        source_id: str,
        published_at,
        external_id: str | None = None,
    ) -> tuple[bool, float, str]:
        """
        Check if the incoming item is a duplicate.
        Returns:
            (is_duplicate: bool, confidence: float, reason: str)
        """
        # ── Strategy 1 & 4: Exact checks (Hash + External ID) ──
        body_hash = self.calculate_hash(body)

        # Check hash duplicate
        stmt_hash = select(RawEvent).where(RawEvent.content_hash == body_hash)
        res_hash = await db.execute(stmt_hash)
        if res_hash.scalars().first():
            return True, 1.0, "Hash Match (SHA-256)"

        # Check external ID duplicate
        if external_id:
            stmt_ext = select(RawEvent).where(
                RawEvent.source_id == source_id, RawEvent.external_id == external_id
            )
            res_ext = await db.execute(stmt_ext)
            if res_ext.scalars().first():
                return True, 1.0, "Source ID & External ID match"

        # ── Strategy 3 & 5: Time Window and Title / Semantic Similarity ──
        # Select events within the configured time window (e.g. 30 minutes for news, 24 hours for broad overlap)
        # Normalize datetimes to handle tz-naive vs tz-aware comparisons safely
        pub_dt = published_at.replace(tzinfo=None) if published_at.tzinfo is not None else published_at
        window_start = pub_dt - timedelta(hours=settings.DEDUP_ENTITY_WINDOW_HOURS)
        window_end = pub_dt + timedelta(hours=settings.DEDUP_ENTITY_WINDOW_HOURS)
        
        stmt_window = select(RawEvent).where(
            RawEvent.published_at.between(window_start, window_end)
        )
        res_window = await db.execute(stmt_window)
        candidates = res_window.scalars().all()

        for cand in candidates:
            # Title similarity
            title_sim = self.calculate_title_similarity(title, cand.title)
            
            # Simple content similarity (SequenceMatcher on first 300 chars to avoid performance hits)
            content_sim = SequenceMatcher(None, body[:300].lower(), cand.body[:300].lower()).ratio()

            # Time proximity
            cand_dt = cand.published_at.replace(tzinfo=None) if cand.published_at.tzinfo is not None else cand.published_at
            time_diff = abs((pub_dt - cand_dt).total_seconds())
            time_factor = 1.0 - min(1.0, time_diff / (settings.DEDUP_TIME_WINDOW_MINUTES * 60))

            # Composite Duplicate Confidence Score (Strategy 6)
            # Weights: Title (0.5), Content (0.3), Time (0.2)
            composite_score = (title_sim * 0.5) + (content_sim * 0.3) + (time_factor * 0.2)

            if composite_score >= settings.DEDUP_COMPOSITE_THRESHOLD:
                reason = (
                    f"Composite Similarity threshold breached: {composite_score:.2f} "
                    f"(Title: {title_sim:.2f}, Body: {content_sim:.2f}, Time factor: {time_factor:.2f}) "
                    f"against event '{cand.id}'"
                )
                return True, round(composite_score, 3), reason

        return False, 0.0, "No duplicate matching criteria triggered"
