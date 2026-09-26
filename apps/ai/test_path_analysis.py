"""
Tests for the V4.2 Event Graph Construction and Path Analysis.
"""
import asyncio
import networkx as nx
import logging
from datetime import datetime, timezone

from models.event import ExtractedEvent, EventEntity
from models.event_chain import EventChain, EventChainNode, EventChainEdge
from event_chain.path_analysis import EventPathAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockAsyncSession:
    def __init__(self, items):
        self.items = items
        
    async def execute(self, stmt):
        class Result:
            def __init__(self, items):
                self._items = items
            def scalars(self):
                class Scalars:
                    def __init__(self, items):
                        self._items = items
                    def first(self):
                        return self._items[0] if self._items else None
                    def all(self):
                        return self._items
                return Scalars(self._items)
        return Result(self.items)

def create_mock_event(id: str, title: str, category: str, date_str: str) -> ExtractedEvent:
    return ExtractedEvent(
        id=id,
        title=title,
        category=category,
        event_date=datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc).date(),
        created_at=datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc),
    )

def setup_mock_db():
    chain = EventChain(id="chain_1")
    
    # Events
    ev1 = create_mock_event("ev_1", "Fed Hikes Rates", "Central Bank Action", "2023-01-01T10:00:00")
    ev2 = create_mock_event("ev_2", "Bond Yields Spike", "Market Reaction", "2023-01-02T10:00:00")
    ev3 = create_mock_event("ev_3", "Tech Stocks Fall", "Market Reaction", "2023-01-03T10:00:00")
    ev4 = create_mock_event("ev_4", "Unrelated Event", "Politics", "2023-01-04T10:00:00")
    
    # Nodes
    n1 = EventChainNode(id="n1", event_id="ev_1"); n1.event = ev1
    n2 = EventChainNode(id="n2", event_id="ev_2"); n2.event = ev2
    n3 = EventChainNode(id="n3", event_id="ev_3"); n3.event = ev3
    n4 = EventChainNode(id="n4", event_id="ev_4"); n4.event = ev4
    
    chain.nodes = [n1, n2, n3, n4]
    
    # Edges
    e1 = EventChainEdge(source_node_id="n1", target_node_id="n2", edge_weight=0.9, confidence=0.9, relationship_type="ECONOMIC_TRANSMISSION", evidence={"time_lag_days": 1})
    e2 = EventChainEdge(source_node_id="n2", target_node_id="n3", edge_weight=0.8, confidence=0.8, relationship_type="MARKET_REACTION", evidence={"time_lag_days": 1})
    # Cycle back to test safety
    e3 = EventChainEdge(source_node_id="n3", target_node_id="n1", edge_weight=0.5, confidence=0.5, relationship_type="FEEDBACK", evidence={})
    
    chain.edges = [e1, e2, e3]
    return chain

async def run_tests():
    chain = setup_mock_db()
    mock_db = MockAsyncSession([chain])
    analyzer = EventPathAnalyzer(mock_db)
    
    logger.info("--- TEST A: GRAPH CONSTRUCTION ---")
    G = await analyzer.build_graph("chain_1")
    assert G.number_of_nodes() == 4
    assert G.number_of_edges() == 3
    logger.info("Test A Passed. Nodes and edges properly mapped.")
    
    logger.info("--- TEST B: PATH ANALYSIS ---")
    paths = analyzer.find_paths(G, "n1", "n3")
    assert len(paths) >= 1
    best_path = paths[0]
    assert best_path.length == 2
    assert best_path.path == ["n1", "n2", "n3"]
    # Path confidence = (0.9 * 0.8) * (0.9 ^ 1) = 0.72 * 0.9 = 0.648
    assert abs(best_path.confidence - 0.648) < 0.01
    logger.info(f"Test B Passed. Path found with expected length 2 and confidence {best_path.confidence}.")
    
    logger.info("--- TEST C: NO PATH ---")
    paths_unrelated = analyzer.find_paths(G, "n1", "n4")
    assert len(paths_unrelated) == 0
    logger.info("Test C Passed. Honestly returned no path.")
    
    logger.info("--- TEST D: CYCLE SAFETY ---")
    # Finding paths in a graph with a cycle n1->n2->n3->n1 should not infinite loop thanks to nx.all_simple_paths
    paths_cycle = analyzer.find_paths(G, "n1", "n3", max_depth=5)
    assert len(paths_cycle) >= 1
    logger.info("Test D Passed. Reached conclusion safely despite cycle.")
    
    logger.info("--- TEST E: FILTERING ---")
    G_filtered = await analyzer.build_graph("chain_1", date_start=datetime.fromisoformat("2023-01-02T00:00:00").replace(tzinfo=timezone.utc).date())
    # n1 is dropped, n2, n3, n4 remain
    assert G_filtered.number_of_nodes() == 3
    assert G_filtered.number_of_edges() == 1  # Only n2->n3 remains
    logger.info("Test E Passed. Graph scoping dynamically changed structure.")
    
    logger.info("--- TEST F: CONNECTED EVENTS (PROPAGATION) ---")
    connected = analyzer.get_connected_events(G, "n1")
    # Should find n2 directly and n3 indirectly
    assert len(connected) == 2
    for c in connected:
        if c.node_id == "n2":
            assert c.connection_type == "DIRECTLY CONNECTED"
        if c.node_id == "n3":
            assert c.connection_type == "INDIRECTLY CONNECTED"
    logger.info("Test F Passed. Breadth-first impact propagation successfully grouped nodes.")

    logger.info("ALL TESTS PASSED.")

if __name__ == "__main__":
    asyncio.run(run_tests())
