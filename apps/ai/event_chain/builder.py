"""
Causal Event Chain Builder and Database Synchronizer.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.event import ExtractedEvent
from models.event_chain import EventChain, EventChainNode, EventChainEdge
from event_chain.relationship import RelationshipScorer
from config import settings

logger = logging.getLogger(__name__)


class EventChainBuilder:
    """
    Builds and updates directed causal event chain graphs, persisting nodes and edges.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def build_default_chain(self, event_ids: list[str] | None = None) -> EventChain:
        """
        Builds or rebuilds the default global event chain.
        If event_ids are provided, it focuses the rebuild window around those events.
        """
        logger.info("Starting causal event chain compilation...")

        # 1. Fetch all processed events
        stmt = select(ExtractedEvent).options(selectinload(ExtractedEvent.entities))
        res = await self.db.execute(stmt)
        events = res.scalars().all()

        if not events:
            # Create an empty chain placeholder
            chain = EventChain(
                title="Global Capital Flow Cascade",
                description="Default global event chain.",
                node_count=0,
                max_depth=0,
            )
            self.db.add(chain)
            await self.db.commit()
            return chain

        # Sort events by date ascending
        events = sorted(
            events,
            key=lambda x: x.event_date or x.created_at.date()
        )

        # 2. Check if a default chain already exists, otherwise create
        stmt_chain = select(EventChain).where(
            EventChain.title == "Global Capital Flow Cascade"
        )
        res_chain = await self.db.execute(stmt_chain)
        chain = res_chain.scalars().first()

        from sqlalchemy import delete
        if chain:
            # Delete old nodes/edges using direct deletes to avoid lazy-load greenlet issues
            await self.db.execute(delete(EventChainNode).where(EventChainNode.chain_id == chain.id))
            await self.db.execute(delete(EventChainEdge).where(EventChainEdge.chain_id == chain.id))
            chain.updated_at = datetime.now(timezone.utc)
        else:
            chain = EventChain(
                title="Global Capital Flow Cascade",
                description="Default global event chain.",
            )
            self.db.add(chain)
            await self.db.flush()

        # 3. Create EventChainNodes in memory
        node_map: dict[str, EventChainNode] = {}
        nodes_to_create: list[EventChainNode] = []
        for i, ev in enumerate(events):
            node = EventChainNode(
                chain_id=chain.id,
                event_id=ev.id,
                depth=0,
            )
            nodes_to_create.append(node)
            node_map[ev.id] = node

        # Add all nodes and flush to get IDs
        self.db.add_all(nodes_to_create)
        await self.db.flush()

        # 4. Form directed edges using the multi-signal Relationship Engine
        edges_to_create = []
        scorer = RelationshipScorer()
        
        for i in range(len(events)):
            ev_a = events[i]

            for j in range(i + 1, len(events)):
                ev_b = events[j]

                # Evaluate relationship
                score_info = scorer.evaluate(ev_a, ev_b)
                
                # Check threshold
                if score_info.score < settings.RELATIONSHIP_THRESHOLD_WEAK:
                    continue
                    
                # Determine source and target based on directionality
                source_id = node_map[ev_a.id].id
                target_id = node_map[ev_b.id].id
                
                if score_info.directionality == "B->A":
                    source_id = node_map[ev_b.id].id
                    target_id = node_map[ev_a.id].id

                edge = EventChainEdge(
                    chain_id=chain.id,
                    source_node_id=source_id,
                    target_node_id=target_id,
                    edge_weight=score_info.score,
                    relationship_type=score_info.relationship_type,
                    confidence=score_info.confidence,
                    time_lag_days=float(score_info.evidence.get("time_lag_days", 0.0)),
                    evidence=score_info.evidence,
                    ai_version=settings.VERSION,
                )
                edges_to_create.append(edge)

        # Add all edges
        if edges_to_create:
            self.db.add_all(edges_to_create)
            await self.db.flush()

        # 5. Calculate node depths (simplistic graph depth)
        # Construct simple local graph adjacency for depth calculation
        adj: dict[str, list[str]] = {n.id: [] for n in nodes_to_create}
        in_degree: dict[str, int] = {n.id: 0 for n in nodes_to_create}
        for e in edges_to_create:
            adj[e.source_node_id].append(e.target_node_id)
            in_degree[e.target_node_id] += 1

        # Queue for topological-like depth assignments
        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        depths = {nid: 0 for nid in in_degree}
        max_depth = 0

        while queue:
            curr = queue.pop(0)
            curr_depth = depths[curr]
            max_depth = max(max_depth, curr_depth)
            
            for child in adj[curr]:
                depths[child] = max(depths[child], curr_depth + 1)
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)

        # Update depths on node records
        for node in nodes_to_create:
            node.depth = depths[node.id]

        chain.node_count = len(nodes_to_create)
        chain.max_depth = max_depth
        if nodes_to_create:
            # Set root event to first event with 0 depth
            roots = [n for n in nodes_to_create if n.depth == 0]
            chain.root_event_id = roots[0].event_id if roots else nodes_to_create[0].event_id

        await self.db.commit()
        logger.info(f"Rebuild completed: Node count: {chain.node_count}, Max depth: {chain.max_depth}")
        return chain
