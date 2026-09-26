"""
Event Path Analysis Engine.
Builds scoped NetworkX graphs and performs path finding and impact propagation.
"""
import networkx as nx
import logging
from typing import Any
from dataclasses import dataclass
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.event_chain import EventChain, EventChainNode, EventChainEdge

logger = logging.getLogger(__name__)

@dataclass
class PathResult:
    path: list[str]  # list of node/event IDs in order
    length: int
    confidence: float
    relationships: list[dict[str, Any]]
    
@dataclass
class ConnectedEventResult:
    node_id: str
    event_id: str
    connection_type: str  # DIRECTLY CONNECTED, INDIRECTLY CONNECTED, LOW-CONFIDENCE CONNECTION
    max_path_confidence: float

class EventPathAnalyzer:
    """
    Analyzes paths and propagation through the Event Chain graph.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def build_graph(self, chain_id: str, date_start=None, date_end=None, category=None) -> nx.DiGraph:
        """
        Constructs a NetworkX DiGraph from database edges, optionally applying scoping filters.
        """
        stmt = (
            select(EventChain)
            .where(EventChain.id == chain_id)
            .options(
                selectinload(EventChain.nodes).selectinload(EventChainNode.event),
                selectinload(EventChain.edges)
            )
        )
        res = await self.db.execute(stmt)
        chain = res.scalars().first()
        
        G = nx.DiGraph()
        if not chain:
            return G
            
        # Apply filters to nodes
        valid_nodes = set()
        for node in chain.nodes:
            if not node.event:
                continue
                
            ev = node.event
            ev_date = ev.event_date or ev.created_at.date()
            
            if date_start and ev_date < date_start:
                continue
            if date_end and ev_date > date_end:
                continue
            if category and ev.category != category:
                continue
                
            valid_nodes.add(node.id)
            G.add_node(node.id, event_id=ev.id, title=ev.title, category=ev.category)
            
        # Add edges only between valid nodes
        for edge in chain.edges:
            if edge.source_node_id in valid_nodes and edge.target_node_id in valid_nodes:
                G.add_edge(
                    edge.source_node_id, 
                    edge.target_node_id, 
                    weight=edge.edge_weight,
                    confidence=edge.confidence,
                    relationship_type=edge.relationship_type,
                    evidence=edge.evidence
                )
                
        return G

    def find_paths(self, G: nx.DiGraph, source_id: str, target_id: str, max_depth: int = 5) -> list[PathResult]:
        """
        Finds all simple paths between source and target, bounded by max_depth to handle cycles safely.
        """
        if not G.has_node(source_id) or not G.has_node(target_id):
            return []
            
        paths = list(nx.all_simple_paths(G, source_id, target_id, cutoff=max_depth))
        
        results = []
        for path in paths:
            # Reconstruct edge data along the path
            relationships = []
            edge_confidences = []
            
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                edge_data = G.get_edge_data(u, v)
                relationships.append({
                    "source_node_id": u,
                    "target_node_id": v,
                    "relationship_type": edge_data.get("relationship_type"),
                    "confidence": edge_data.get("confidence", 0.0),
                    "evidence": edge_data.get("evidence", {})
                })
                edge_confidences.append(edge_data.get("confidence", 0.0))
                
            # Calculate aggregate path confidence
            # Penalize longer paths: Product(edge_conf) * (0.9 ^ (len(path)-1))
            product_conf = 1.0
            for conf in edge_confidences:
                product_conf *= conf
                
            path_length = len(path) - 1
            decay = 0.9 ** (path_length - 1) if path_length > 1 else 1.0
            agg_confidence = product_conf * decay
            
            results.append(PathResult(
                path=path,
                length=path_length,
                confidence=round(agg_confidence, 4),
                relationships=relationships
            ))
            
        # Sort by confidence descending
        results.sort(key=lambda x: x.confidence, reverse=True)
        return results
        
    def get_connected_events(self, G: nx.DiGraph, source_id: str, max_depth: int = 5, threshold: float = 0.1) -> list[ConnectedEventResult]:
        """
        BFS traversal to find directly and indirectly connected events organically limited by path confidence decay.
        """
        if not G.has_node(source_id):
            return []
            
        # We will track the maximum confidence to reach each node
        best_conf = {source_id: 1.0}
        
        # queue stores (current_node, current_confidence, current_depth)
        queue = [(source_id, 1.0, 0)]
        visited_edges = set()
        
        while queue:
            curr_node, curr_conf, depth = queue.pop(0)
            
            if depth >= max_depth:
                continue
                
            for neighbor in G.successors(curr_node):
                edge_sig = (curr_node, neighbor)
                if edge_sig in visited_edges:
                    continue # cycle prevention in traversal
                    
                visited_edges.add(edge_sig)
                
                edge_data = G.get_edge_data(curr_node, neighbor)
                edge_conf = edge_data.get("confidence", 0.0)
                
                # New confidence: multiply edge conf and apply length decay penalty (0.9 per hop beyond 1)
                new_conf = curr_conf * edge_conf * 0.9
                
                if new_conf < threshold:
                    continue # terminate traversal along this weak path organically
                    
                if neighbor not in best_conf or new_conf > best_conf[neighbor]:
                    best_conf[neighbor] = new_conf
                    queue.append((neighbor, new_conf, depth + 1))
                    
        results = []
        for node_id, conf in best_conf.items():
            if node_id == source_id:
                continue
                
            # Classify connection type
            if G.has_edge(source_id, node_id) and conf >= 0.7:
                conn_type = "DIRECTLY CONNECTED"
            elif conf >= 0.4:
                conn_type = "INDIRECTLY CONNECTED"
            else:
                conn_type = "LOW-CONFIDENCE CONNECTION"
                
            results.append(ConnectedEventResult(
                node_id=node_id,
                event_id=G.nodes[node_id].get('event_id', node_id),
                connection_type=conn_type,
                max_path_confidence=round(conf, 4)
            ))
            
        return results
