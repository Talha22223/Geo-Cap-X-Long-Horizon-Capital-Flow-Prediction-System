"""
REST API Router for Causal Event Chains (DAG).
"""
from fastapi import APIRouter, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.dependencies import DBSession
from core.exceptions import ChainNotFoundException
from models.event_chain import EventChain, EventChainNode, EventChainEdge
from schemas.common import APIResponse
from schemas.event_chain import ChainOut, GraphOut, NodeOut, EdgeOut, ChainBuildReq, EventPathOut, ConnectedEventOut
from workers.job_manager import JobLifecycleManager
from workers.tasks.chain_task import run_chain_task
from event_chain.path_analysis import EventPathAnalyzer
from datetime import date
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/event-chain", tags=["Event Chains"])


@router.post("/build", response_model=APIResponse[dict], status_code=202)
async def rebuild_event_chain(
    req: ChainBuildReq,
    db: DBSession,
    bg_tasks: BackgroundTasks
):
    """
    Trigger a complete background rebuild and SNA metric recalculation of the causal graph.
    """
    job = await JobLifecycleManager.create_job(db, "build-chain")
    bg_tasks.add_task(run_chain_task, job.id)

    return APIResponse(
        success=True,
        data={"job_id": job.id, "status": "PENDING"}
    )


@router.get("", response_model=APIResponse[list[ChainOut]])
async def list_chains(db: DBSession):
    """
    List all created event chains in the workspace.
    """
    stmt = select(EventChain).order_by(EventChain.created_at.desc())
    res = await db.execute(stmt)
    items = res.scalars().all()
    return APIResponse(success=True, data=[ChainOut.model_validate(i) for i in items])


@router.get("/{id}", response_model=APIResponse[ChainOut])
async def get_chain(id: str, db: DBSession):
    """
    Get core properties of a specific event chain.
    """
    stmt = select(EventChain).where(EventChain.id == id)
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise ChainNotFoundException(id)
    return APIResponse(success=True, data=ChainOut.model_validate(item))


@router.get("/{id}/graph", response_model=APIResponse[GraphOut])
async def get_chain_graph(
    id: str, 
    db: DBSession,
    date_start: Optional[date] = None,
    date_end: Optional[date] = None,
    category: Optional[str] = None
):
    """
    Return full adjacency representation of the graph (nodes & edges) for visualization.
    Filters can be applied to scope the graph dynamically.
    """
    analyzer = EventPathAnalyzer(db)
    G = await analyzer.build_graph(id, date_start, date_end, category)
    
    if G.number_of_nodes() == 0:
        # Check if chain exists at all
        stmt = select(EventChain).where(EventChain.id == id)
        chain = (await db.execute(stmt)).scalars().first()
        if not chain:
            raise ChainNotFoundException(id)
        return APIResponse(success=True, data=GraphOut(chain=ChainOut.model_validate(chain), nodes=[], edges=[]))

    stmt = select(EventChain).where(EventChain.id == id)
    chain = (await db.execute(stmt)).scalars().first()
    
    nodes_out = []
    # Re-fetch node info from DB or use G.nodes data
    for n_id, data in G.nodes(data=True):
        # We need the full NodeOut schema, so we should fetch the node record
        pass # Better to query the nodes directly since we need SNA stats which are on the node record
        
    # Actually, the prompt states: "filtering must happen before or during graph construction".
    # Since EventPathAnalyzer does exactly that, let's just fetch the DB nodes that made it into G.
    valid_node_ids = list(G.nodes)
    stmt_nodes = select(EventChainNode).where(EventChainNode.id.in_(valid_node_ids)).options(selectinload(EventChainNode.event))
    res_nodes = await db.execute(stmt_nodes)
    db_nodes = res_nodes.scalars().all()
    
    for n in db_nodes:
        n_out = NodeOut.model_validate(n)
        if n.event:
            n_out.event_title = n.event.title
            n_out.event_category = n.event.category
            n_out.event_sentiment = n.event.sentiment
        nodes_out.append(n_out)

    edges_out = []
    for u, v, data in G.edges(data=True):
        edges_out.append(EdgeOut(
            id=f"{u}-{v}",
            chain_id=id,
            source_node_id=u,
            target_node_id=v,
            edge_weight=data.get("weight", 0.0),
            relationship_type=data.get("relationship_type", ""),
            confidence=data.get("confidence", 0.0),
            time_lag_days=data.get("evidence", {}).get("time_lag_days", 0.0),
            evidence=data.get("evidence", {}),
            created_by="path_analyzer",
            ai_version="v4.2"
        ))

    return APIResponse(
        success=True,
        data=GraphOut(
            chain=ChainOut.model_validate(chain),
            nodes=nodes_out,
            edges=edges_out
        )
    )

@router.get("/{id}/paths", response_model=APIResponse[list[EventPathOut]])
async def get_event_paths(
    id: str, 
    source: str, 
    target: str, 
    db: DBSession,
    date_start: Optional[date] = None,
    date_end: Optional[date] = None,
    category: Optional[str] = None
):
    """
    Find ranked relationship paths between two events.
    """
    analyzer = EventPathAnalyzer(db)
    G = await analyzer.build_graph(id, date_start, date_end, category)
    
    paths = analyzer.find_paths(G, source, target)
    
    return APIResponse(success=True, data=[EventPathOut.model_validate(p.__dict__) for p in paths])

@router.get("/{id}/connected/{node_id}", response_model=APIResponse[list[ConnectedEventOut]])
async def get_connected_events(
    id: str, 
    node_id: str, 
    db: DBSession,
    date_start: Optional[date] = None,
    date_end: Optional[date] = None,
    category: Optional[str] = None
):
    """
    Find direct and indirectly connected events through confident relationship paths.
    """
    analyzer = EventPathAnalyzer(db)
    G = await analyzer.build_graph(id, date_start, date_end, category)
    
    connected = analyzer.get_connected_events(G, node_id)
    
    return APIResponse(success=True, data=[ConnectedEventOut.model_validate(c.__dict__) for c in connected])


@router.get("/{id}/ancestors/{node_id}", response_model=APIResponse[list[NodeOut]])
async def get_ancestors(id: str, node_id: str, db: DBSession):
    """
    Find all parent/ancestor nodes that have directed paths leading into target node_id.
    """
    # Load graph structure
    stmt = select(EventChainEdge).where(EventChainEdge.chain_id == id)
    res = await db.execute(stmt)
    edges = res.scalars().all()
    
    import networkx as nx
    G = nx.DiGraph()
    for e in edges:
        G.add_edge(e.source_node_id, e.target_node_id)
        
    if not G.has_node(node_id):
        return APIResponse(success=True, data=[])

    ancestor_ids = list(nx.ancestors(G, node_id))
    
    # Load nodes
    stmt_nodes = select(EventChainNode).where(EventChainNode.id.in_(ancestor_ids)).options(selectinload(EventChainNode.event))
    res_nodes = await db.execute(stmt_nodes)
    nodes = res_nodes.scalars().all()

    nodes_out = []
    for n in nodes:
        n_out = NodeOut.model_validate(n)
        if n.event:
            n_out.event_title = n.event.title
            n_out.event_category = n.event.category
            n_out.event_sentiment = n.event.sentiment
        nodes_out.append(n_out)

    return APIResponse(success=True, data=nodes_out)


@router.get("/{id}/descendants/{node_id}", response_model=APIResponse[list[NodeOut]])
async def get_descendants(id: str, node_id: str, db: DBSession):
    """
    Find all child/descendant nodes reachable starting from target node_id.
    """
    # Load graph structure
    stmt = select(EventChainEdge).where(EventChainEdge.chain_id == id)
    res = await db.execute(stmt)
    edges = res.scalars().all()
    
    import networkx as nx
    G = nx.DiGraph()
    for e in edges:
        G.add_edge(e.source_node_id, e.target_node_id)
        
    if not G.has_node(node_id):
        return APIResponse(success=True, data=[])

    descendant_ids = list(nx.descendants(G, node_id))
    
    # Load nodes
    stmt_nodes = select(EventChainNode).where(EventChainNode.id.in_(descendant_ids)).options(selectinload(EventChainNode.event))
    res_nodes = await db.execute(stmt_nodes)
    nodes = res_nodes.scalars().all()

    nodes_out = []
    for n in nodes:
        n_out = NodeOut.model_validate(n)
        if n.event:
            n_out.event_title = n.event.title
            n_out.event_category = n.event.category
            n_out.event_sentiment = n.event.sentiment
        nodes_out.append(n_out)

    return APIResponse(success=True, data=nodes_out)
