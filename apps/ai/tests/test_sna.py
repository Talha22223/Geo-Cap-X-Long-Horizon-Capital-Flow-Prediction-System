"""
Tests for Social Network Analysis (SNA) analyzer.
"""
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from event_chain.builder import EventChainBuilder
from sna.analyzer import NetworkAnalyzer
from models.event import ExtractedEvent, RawEvent, EventEntity
from models.sna import NetworkAnalysisResult
from models.event_chain import EventChainNode


@pytest.mark.asyncio
async def test_sna_metrics_computation(db: AsyncSession):
    # 1. Seed events and entities
    pub = datetime.now(timezone.utc)
    raws = []
    exts = []
    
    # Create 3 events to construct a simple A -> B -> C triangle or line
    for letter in ("a", "b", "c"):
        raw = RawEvent(
            source_id="seed", source_type="SEED", title=f"Event {letter.upper()}",
            body=f"Causal event {letter} related to finance in United States.",
            content_hash=f"hash-{letter}", published_at=pub
        )
        db.add(raw)
        raws.append(raw)
    await db.flush()

    for i, letter in enumerate(("a", "b", "c")):
        ext = ExtractedEvent(
            raw_event_id=raws[i].id, title=f"Event {letter.upper()}",
            body=f"Causal event {letter} related to finance in United States.",
            countries=["United States"], category="ECONOMIC", sentiment="BULLISH",
            extraction_confidence=0.8, classification_confidence=0.8, overall_confidence=0.8,
            event_date=(pub + timedelta(days=i)).date()
        )
        db.add(ext)
        exts.append(ext)
    await db.flush()

    for ext in exts:
        db.add(EventEntity(event_id=ext.id, entity_type="country", entity_value="United States"))
    await db.commit()

    # 2. Build chain
    builder = EventChainBuilder(db)
    chain = await builder.build_default_chain()

    # 3. Analyze graph with SNA NetworkAnalyzer
    analyzer = NetworkAnalyzer(db)
    summary = await analyzer.analyze_chain(chain.id)

    # 4. Assert summary statistics
    assert summary.node_count == 3
    assert summary.edge_count > 0
    assert summary.network_density > 0.0
    assert summary.clustering_coefficient >= 0.0
    assert summary.connected_components >= 1

    # Verify node centrality fields
    from sqlalchemy import select
    stmt_nodes = select(EventChainNode).where(EventChainNode.chain_id == chain.id)
    res_nodes = await db.execute(stmt_nodes)
    nodes = res_nodes.scalars().all()

    for n in nodes:
        assert n.degree_centrality >= 0.0
        assert n.pagerank > 0.0
        assert n.influence_score > 0.0
        assert n.community_id is not None
