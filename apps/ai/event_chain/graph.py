"""
NetworkX Graph Manager for Event Chains.
"""
import networkx as nx
from typing import Any
import logging

logger = logging.getLogger(__name__)


class EventGraphManager:
    """
    Wraps NetworkX DiGraph to manage nodes (events) and edges (causal links).
    """

    def __init__(self) -> None:
        self.G = nx.DiGraph()

    def add_event_node(self, event_id: str, metadata: dict[str, Any]) -> None:
        """Add event as a graph node with full metadata vector."""
        self.G.add_node(event_id, **metadata)

    def add_causal_edge(
        self,
        source_id: str,
        target_id: str,
        weight: float,
        relation_type: str,
        confidence: float,
        time_lag_days: float,
    ) -> None:
        """Add directed edge between source and target events."""
        self.G.add_edge(
            source_id,
            target_id,
            weight=weight,
            relation_type=relation_type,
            confidence=confidence,
            time_lag_days=time_lag_days,
        )

    def get_adjacency_list(self) -> dict[str, Any]:
        """Convert NetworkX graph into serializable adjacency representation."""
        nodes = []
        for n, data in self.G.nodes(data=True):
            nodes.append({"id": n, "metadata": data})

        edges = []
        for u, v, data in self.G.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "weight": data.get("weight", 1.0),
                "relationship_type": data.get("relation_type", ""),
                "confidence": data.get("confidence", 1.0),
                "time_lag_days": data.get("time_lag_days", 0.0),
            })

        return {"nodes": nodes, "edges": edges}

    def clear(self) -> None:
        self.G.clear()
