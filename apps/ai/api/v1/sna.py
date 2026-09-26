"""
REST API Router for Social Network Analysis (SNA) & Graph Intelligence.
"""
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.dependencies import DBSession
from core.exceptions import ChainNotFoundException
from models.event_chain import EventChain, EventChainNode
from models.sna import NetworkAnalysisResult
from schemas.common import APIResponse
from schemas.sna import (
    SNAStatsOut,
    CentralityOut,
    GraphSummaryOut,
    TopInfluentialEventOut,
    BridgeEventOut,
    CommunityDetailOut,
)

router = APIRouter(tags=["Social Network Analysis (SNA)"])


@router.get("/network/statistics", response_model=APIResponse[list[SNAStatsOut]])
async def get_network_statistics(db: DBSession):
    """
    Get full SNA graph metrics for all analyzed event chains.
    """
    stmt = select(NetworkAnalysisResult).order_by(NetworkAnalysisResult.created_at.desc())
    res = await db.execute(stmt)
    items = res.scalars().all()
    results = []
    for i in items:
        bridge_nodes = []
        if i.bridge_events_json:
            for b in i.bridge_events_json:
                bridge_nodes.append({
                    "id": b.get("event_id") or b.get("node_id"),
                    "node_id": b.get("node_id"),
                    "event_id": b.get("event_id"),
                    "title": b.get("event_title") or b.get("title") or "Bridge Event",
                    "betweenness": b.get("bridge_importance", 0.0),
                    "centrality_score": b.get("normalized_bridge_importance", 0.0),
                    "inter_community_edge_count": b.get("inter_community_edge_count", 0),
                    "connected_communities": b.get("connected_communities", []),
                    "role": b.get("structural_role_description", "")
                })

        communities = []
        if i.community_summary_json:
            for c_id, c in i.community_summary_json.items():
                communities.append({
                    "id": c.get("community_id", c_id),
                    "label": c.get("label", f"Cluster {c_id}"),
                    "size": c.get("event_count", len(c.get("events", []))),
                    "dominant_category": c.get("dominant_category", "ECONOMIC"),
                    "confidence": c.get("confidence", 1.0),
                    "events": [e.get("title", "") for e in c.get("events", [])]
                })

        stat = SNAStatsOut(
            id=i.id,
            chain_id=i.chain_id,
            node_count=i.node_count,
            edge_count=i.edge_count,
            total_nodes=i.node_count,
            total_edges=i.edge_count,
            network_density=i.network_density,
            density=i.network_density,
            clustering_coefficient=i.clustering_coefficient,
            connected_components=i.connected_components,
            graph_diameter=i.graph_diameter,
            avg_shortest_path=i.avg_shortest_path,
            community_count=len(communities),
            bridge_event_count=len(bridge_nodes),
            bridge_nodes=bridge_nodes,
            communities=communities,
            created_at=i.created_at
        )
        results.append(stat)

    return APIResponse(success=True, data=results)


@router.get("/sna/summary", response_model=APIResponse[GraphSummaryOut])
async def get_graph_summary(db: DBSession, chain_name: str = "Global Capital Flow Cascade"):
    """
    Get complete graph summary, snapshot metadata, and metric execution statuses.
    """
    stmt_chain = select(EventChain).where(EventChain.title == chain_name)
    res_chain = await db.execute(stmt_chain)
    chain = res_chain.scalars().first()
    if not chain:
        raise ChainNotFoundException(chain_name)

    stmt_summary = select(NetworkAnalysisResult).where(NetworkAnalysisResult.chain_id == chain.id).order_by(NetworkAnalysisResult.created_at.desc())
    res_summary = await db.execute(stmt_summary)
    summary = res_summary.scalars().first()

    if not summary:
        # Return structured zero state if not analyzed yet
        return APIResponse(
            success=True,
            data=GraphSummaryOut(
                chain_id=chain.id,
                node_count=0,
                edge_count=0,
                network_density=0.0,
                clustering_coefficient=0.0,
                connected_components=0,
                metric_statuses={},
                community_count=0,
                bridge_event_count=0,
                snapshot_metadata={"status": "UNANALYZED"},
                created_at=chain.created_at
            )
        )

    comm_summary = summary.community_summary_json or {}
    bridge_events = summary.bridge_events_json or []

    out = GraphSummaryOut(
        chain_id=summary.chain_id,
        node_count=summary.node_count,
        edge_count=summary.edge_count,
        network_density=summary.network_density,
        clustering_coefficient=summary.clustering_coefficient,
        connected_components=summary.connected_components,
        graph_diameter=summary.graph_diameter,
        avg_shortest_path=summary.avg_shortest_path,
        metric_statuses=summary.metric_status_json or {},
        community_count=len(comm_summary),
        bridge_event_count=len(bridge_events),
        snapshot_metadata=summary.metadata_json or {},
        created_at=summary.created_at
    )
    return APIResponse(success=True, data=out)


@router.get("/sna/top-influential", response_model=APIResponse[list[TopInfluentialEventOut]])
async def get_top_influential_events(
    db: DBSession,
    chain_name: str = "Global Capital Flow Cascade",
    limit: int = Query(default=10, ge=1, le=100)
):
    """
    Get top influential events ranked by composite graph influence score with detailed breakdown.
    """
    stmt_chain = select(EventChain).where(EventChain.title == chain_name)
    res_chain = await db.execute(stmt_chain)
    chain = res_chain.scalars().first()
    if not chain:
        raise ChainNotFoundException(chain_name)

    stmt_nodes = (
        select(EventChainNode)
        .where(EventChainNode.chain_id == chain.id)
        .options(selectinload(EventChainNode.event))
        .order_by(EventChainNode.influence_score.desc())
        .limit(limit)
    )
    res_nodes = await db.execute(stmt_nodes)
    nodes = res_nodes.scalars().all()

    # Get max/min across all nodes in chain for normalized level mapping
    all_nodes_stmt = select(EventChainNode).where(EventChainNode.chain_id == chain.id)
    all_res = await db.execute(all_nodes_stmt)
    all_nodes = all_res.scalars().all()

    def get_norm(val, arr):
        if not arr:
            return 0.0
        min_v, max_v = min(arr), max(arr)
        if max_v == min_v:
            return 0.5 if max_v > 0 else 0.0
        return (val - min_v) / (max_v - min_v)

    def get_level(norm_val):
        if norm_val > 0.66:
            return "high"
        if norm_val >= 0.33:
            return "medium"
        return "low"

    pr_arr = [n.pagerank for n in all_nodes]
    bw_arr = [n.betweenness_centrality for n in all_nodes]
    deg_arr = [n.degree_centrality for n in all_nodes]
    eig_arr = [n.eigenvector_centrality for n in all_nodes]

    out = []
    for n in nodes:
        event = n.event
        pr_norm = get_norm(n.pagerank, pr_arr)
        bw_norm = get_norm(n.betweenness_centrality, bw_arr)
        deg_norm = get_norm(n.degree_centrality, deg_arr)
        eig_norm = get_norm(n.eigenvector_centrality, eig_arr)

        contributions = {
            "network_influence": {
                "raw": round(n.pagerank, 4),
                "normalized": round(pr_norm, 4),
                "level": get_level(pr_norm),
                "weight": 0.35
            },
            "bridge_importance": {
                "raw": round(n.betweenness_centrality, 4),
                "normalized": round(bw_norm, 4),
                "level": get_level(bw_norm),
                "weight": 0.30
            },
            "direct_connectivity": {
                "raw": round(n.degree_centrality, 4),
                "normalized": round(deg_norm, 4),
                "level": get_level(deg_norm),
                "weight": 0.20
            },
            "eigenvector_significance": {
                "raw": round(n.eigenvector_centrality, 4),
                "normalized": round(eig_norm, 4),
                "level": get_level(eig_norm),
                "weight": 0.15
            }
        }

        explanation = (
            f"Event Influence Score: {n.influence_score:.2f} within network. "
            f"Network influence is {get_level(pr_norm)} (norm: {pr_norm:.2f}), "
            f"bridge importance is {get_level(bw_norm)} (norm: {bw_norm:.2f}), "
            f"direct connectivity is {get_level(deg_norm)} (norm: {deg_norm:.2f}), "
            f"eigenvector significance is {get_level(eig_norm)} (norm: {eig_norm:.2f})."
        )

        out.append(
            TopInfluentialEventOut(
                node_id=n.id,
                event_id=n.event_id,
                event_title=event.title if event else "Unknown Event",
                category=event.category if event else "ECONOMIC",
                influence_score=n.influence_score,
                contributions=contributions,
                explanation=explanation
            )
        )

    return APIResponse(success=True, data=out)


@router.get("/sna/bridge-events", response_model=APIResponse[list[BridgeEventOut]])
async def get_bridge_events(db: DBSession, chain_name: str = "Global Capital Flow Cascade"):
    """
    Get identified structural bridge events that connect distinct graph regions/communities.
    """
    stmt_chain = select(EventChain).where(EventChain.title == chain_name)
    res_chain = await db.execute(stmt_chain)
    chain = res_chain.scalars().first()
    if not chain:
        raise ChainNotFoundException(chain_name)

    stmt_summary = select(NetworkAnalysisResult).where(NetworkAnalysisResult.chain_id == chain.id).order_by(NetworkAnalysisResult.created_at.desc())
    res_summary = await db.execute(stmt_summary)
    summary = res_summary.scalars().first()

    if not summary or not summary.bridge_events_json:
        return APIResponse(success=True, data=[])

    raw_bridges = summary.bridge_events_json
    out = [BridgeEventOut.model_validate(b) for b in raw_bridges]
    return APIResponse(success=True, data=out)


@router.get("/sna/communities-detailed", response_model=APIResponse[list[CommunityDetailOut]])
async def get_communities_detailed(db: DBSession, chain_name: str = "Global Capital Flow Cascade"):
    """
    Get topological communities with evidence-based descriptive labels, confidence, and composition.
    """
    stmt_chain = select(EventChain).where(EventChain.title == chain_name)
    res_chain = await db.execute(stmt_chain)
    chain = res_chain.scalars().first()
    if not chain:
        raise ChainNotFoundException(chain_name)

    stmt_summary = select(NetworkAnalysisResult).where(NetworkAnalysisResult.chain_id == chain.id).order_by(NetworkAnalysisResult.created_at.desc())
    res_summary = await db.execute(stmt_summary)
    summary = res_summary.scalars().first()

    if not summary or not summary.community_summary_json:
        return APIResponse(success=True, data=[])

    raw_comm = summary.community_summary_json
    out = [CommunityDetailOut.model_validate(c) for c in raw_comm.values()]
    return APIResponse(success=True, data=out)


@router.get("/sna/centrality", response_model=APIResponse[list[CentralityOut]])
async def get_node_centrality(db: DBSession, chain_name: str = "Global Capital Flow Cascade"):
    """
    Query all nodes in a chain with their calculated centrality measures.
    """
    stmt_chain = select(EventChain).where(EventChain.title == chain_name)
    res_chain = await db.execute(stmt_chain)
    chain = res_chain.scalars().first()
    if not chain:
        raise ChainNotFoundException(chain_name)

    stmt = select(EventChainNode).where(EventChainNode.chain_id == chain.id).options(selectinload(EventChainNode.event))
    res = await db.execute(stmt)
    nodes = res.scalars().all()

    out = []
    for n in nodes:
        out.append(
            CentralityOut(
                event_id=n.event_id,
                event_title=n.event.title if n.event else "Unknown Event",
                influence_score=n.influence_score,
                pagerank=n.pagerank,
                degree_centrality=n.degree_centrality,
                betweenness_centrality=n.betweenness_centrality,
                closeness_centrality=n.closeness_centrality,
                eigenvector_centrality=n.eigenvector_centrality,
                community_id=n.community_id
            )
        )
    return APIResponse(success=True, data=out)


@router.get("/sna/communities", response_model=APIResponse[dict[str, list[dict]]])
async def get_node_communities(db: DBSession, chain_name: str = "Global Capital Flow Cascade"):
    """
    Group nodes by their Louvain community label or ID.
    """
    stmt_chain = select(EventChain).where(EventChain.title == chain_name)
    res_chain = await db.execute(stmt_chain)
    chain = res_chain.scalars().first()
    if not chain:
        raise ChainNotFoundException(chain_name)

    stmt = select(EventChainNode).where(EventChainNode.chain_id == chain.id).options(selectinload(EventChainNode.event))
    res = await db.execute(stmt)
    nodes = res.scalars().all()

    communities: dict[str, list[dict]] = {}
    for n in nodes:
        c_id = n.community_id or "0"
        communities.setdefault(c_id, []).append({
            "event_id": n.event_id,
            "title": n.event.title if n.event else "Unknown Event",
            "influence_score": n.influence_score,
            "category": n.event.category if n.event else "ECONOMIC"
        })
    return APIResponse(success=True, data=communities)
