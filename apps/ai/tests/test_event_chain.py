"""
Tests for Event Chain Engine and builder.
"""
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from event_chain.builder import EventChainBuilder
from event_chain.propagation import ConfidencePropagator
from models.event import ExtractedEvent, RawEvent, EventEntity
from models.event_chain import EventChain, EventChainNode, EventChainEdge


@pytest.mark.asyncio
async def test_chain_building_logic(db: AsyncSession):
    # 1. Seed two related events sharing entities (e.g. United States)
    pub = datetime.now(timezone.utc)
    
    raw_a = RawEvent(source_id="seed", source_type="SEED", title="Fed Hike", body="Fed raised interest rates in the United States today.", content_hash="hash-a", published_at=pub)
    raw_b = RawEvent(source_id="seed", source_type="SEED", title="Gold Decline", body="Gold prices decline in the United States as yields rise.", content_hash="hash-b", published_at=pub + timedelta(days=2))
    db.add(raw_a)
    db.add(raw_b)
    await db.flush()

    ext_a = ExtractedEvent(
        raw_event_id=raw_a.id, title="Fed Hike", body="Fed raised interest rates in the United States today.",
        countries=["United States"], category="MONETARY_POLICY", sentiment="BEARISH",
        extraction_confidence=0.8, classification_confidence=0.8, overall_confidence=0.8
    )
    ext_b = ExtractedEvent(
        raw_event_id=raw_b.id, title="Gold Decline", body="Gold prices decline in the United States as yields rise.",
        countries=["United States"], category="ECONOMIC", sentiment="BEARISH",
        extraction_confidence=0.7, classification_confidence=0.7, overall_confidence=0.7
    )
    db.add(ext_a)
    db.add(ext_b)
    await db.flush()

    # Add shared country entity
    db.add(EventEntity(event_id=ext_a.id, entity_type="country", entity_value="United States"))
    db.add(EventEntity(event_id=ext_b.id, entity_type="country", entity_value="United States"))
    await db.commit()

    # 2. Rebuild event chain
    builder = EventChainBuilder(db)
    chain = await builder.build_default_chain()

    assert chain.node_count == 2
    
    from sqlalchemy import select
    res_nodes = await db.execute(select(EventChainNode).where(EventChainNode.chain_id == chain.id))
    nodes = res_nodes.scalars().all()
    res_edges = await db.execute(select(EventChainEdge).where(EventChainEdge.chain_id == chain.id))
    edges = res_edges.scalars().all()

    assert len(nodes) == 2
    assert len(edges) == 1
    assert edges[0].edge_weight > 0.0
    assert chain.max_depth == 1


def test_confidence_propagator():
    # Test single edge decay
    p_conf = 0.8
    edge_w = 0.9
    child = ConfidencePropagator.propagate(p_conf, edge_w, decay_factor=0.8)
    assert child == round(0.8 * 0.9 * 0.8, 3)

    # Test path decay
    path = [(0.8, 1.0), (0.7, 0.9)]
    path_conf = ConfidencePropagator.calculate_path_confidence(path)
    assert 0.0 <= path_conf <= 1.0
