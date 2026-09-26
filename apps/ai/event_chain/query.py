"""
Graph Query Helpers for Event Chains.
"""
import networkx as nx
from typing import Any


class GraphQueryService:
    @staticmethod
    def get_ancestors(G: nx.DiGraph, node_id: str) -> list[str]:
        """Return all nodes that have a directed path leading into target node_id."""
        if not G.has_node(node_id):
            return []
        return list(nx.ancestors(G, node_id))

    @staticmethod
    def get_descendants(G: nx.DiGraph, node_id: str) -> list[str]:
        """Return all nodes reachable via directed edges starting at node_id."""
        if not G.has_node(node_id):
            return []
        return list(nx.descendants(G, node_id))

    @staticmethod
    def find_shortest_path(G: nx.DiGraph, source: str, target: str) -> list[str]:
        """Find the shortest directed path between source and target nodes."""
        if not G.has_node(source) or not G.has_node(target):
            return []
        try:
            return list(nx.shortest_path(G, source, target))
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []

    @staticmethod
    def get_path_metadata(G: nx.DiGraph, path: list[str]) -> list[dict[str, Any]]:
        """Return node-by-node metadata for a given path list."""
        result = []
        for i, node in enumerate(path):
            node_data = G.nodes[node]
            edge_data = {}
            if i > 0:
                edge_data = G.edges[path[i-1], node]
            result.append({
                "node_id": node,
                "node_data": node_data,
                "incoming_edge": edge_data
            })
        return result
