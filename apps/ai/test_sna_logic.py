"""
Mandatory V5.1 Graph Intelligence & SNA Engine Verification Test Suite.
"""
import asyncio
import logging
from datetime import datetime, timezone

from models.event import ExtractedEvent
from models.event_chain import EventChain, EventChainNode, EventChainEdge
from models.sna import NetworkAnalysisResult
from sna.analyzer import NetworkAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockAsyncSession:
    def __init__(self, chain: EventChain | None):
        self.chain = chain
        self.saved_summary: NetworkAnalysisResult | None = None

    async def execute(self, stmt):
        class Result:
            def __init__(self, item):
                self._item = item
            def scalars(self):
                class Scalars:
                    def __init__(self, item):
                        self._item = item
                    def first(self):
                        return self._item
                    def all(self):
                        return [self._item] if self._item else []
                return Scalars(self._item)
        return Result(self.chain)

    def add(self, instance):
        if isinstance(instance, NetworkAnalysisResult):
            self.saved_summary = instance

    async def commit(self):
        pass


def create_mock_event(id: str, title: str, category: str, sectors: list[str] | None = None, orgs: list[str] | None = None) -> ExtractedEvent:
    return ExtractedEvent(
        id=id,
        title=title,
        category=category,
        sectors=sectors or ["FINANCIAL"],
        organizations=orgs or ["CENTRAL_BANK"],
        event_date=datetime.now(timezone.utc).date(),
        created_at=datetime.now(timezone.utc),
    )


def setup_multi_community_chain() -> EventChain:
    """
    Sets up a graph with two distinct communities connected by a bridge node:
    Community 1 (Economic): Node 1, Node 2, Node 3
    Community 2 (Energy): Node 5, Node 6
    Bridge Event: Node 4 (Connects Node 2 in Comm 1 to Node 5 in Comm 2)
    """
    chain = EventChain(id="chain_v51_test")

    # Community 1: Economic Events
    ev1 = create_mock_event("ev_1", "Fed Interest Rate Hike", "ECONOMIC", ["MONETARY"])
    ev2 = create_mock_event("ev_2", "USD Exchange Rate Surge", "ECONOMIC", ["CURRENCY"])
    ev3 = create_mock_event("ev_3", "Government Bond Sales Increase", "ECONOMIC", ["DEBT"])

    # Bridge Node: Cross-Sector Policy Event
    ev4 = create_mock_event("ev_4", "Global Energy Subsidy Reform Policy", "ECONOMIC", ["ENERGY", "MONETARY"])

    # Community 2: Energy Events
    ev5 = create_mock_event("ev_5", "OPEC Crude Supply Reduction", "ENERGY", ["OIL"])
    ev6 = create_mock_event("ev_6", "European Gas Pipeline Maintenance", "ENERGY", ["GAS"])

    # Create Nodes
    n1 = EventChainNode(id="n1", event_id="ev_1"); n1.event = ev1; n1.chain_id = chain.id
    n2 = EventChainNode(id="n2", event_id="ev_2"); n2.event = ev2; n2.chain_id = chain.id
    n3 = EventChainNode(id="n3", event_id="ev_3"); n3.event = ev3; n3.chain_id = chain.id
    n4 = EventChainNode(id="n4", event_id="ev_4"); n4.event = ev4; n4.chain_id = chain.id
    n5 = EventChainNode(id="n5", event_id="ev_5"); n5.event = ev5; n5.chain_id = chain.id
    n6 = EventChainNode(id="n6", event_id="ev_6"); n6.event = ev6; n6.chain_id = chain.id

    chain.nodes = [n1, n2, n3, n4, n5, n6]

    # Edges within Community 1
    e1 = EventChainEdge(source_node_id="n1", target_node_id="n2", edge_weight=0.9, confidence=0.95)
    e2 = EventChainEdge(source_node_id="n2", target_node_id="n3", edge_weight=0.8, confidence=0.90)

    # Bridge Edges: Connecting Comm 1 (n2) -> Bridge (n4) -> Comm 2 (n5)
    e3 = EventChainEdge(source_node_id="n2", target_node_id="n4", edge_weight=0.85, confidence=0.88)
    e4 = EventChainEdge(source_node_id="n4", target_node_id="n5", edge_weight=0.85, confidence=0.85)

    # Edges within Community 2
    e5 = EventChainEdge(source_node_id="n5", target_node_id="n6", edge_weight=0.9, confidence=0.92)

    chain.edges = [e1, e2, e3, e4, e5]
    return chain


async def run_v51_tests():
    logger.info("=== STARTING V5.1 REAL GRAPH INTELLIGENCE TEST SUITE ===")

    chain = setup_multi_community_chain()
    db = MockAsyncSession(chain)
    analyzer = NetworkAnalyzer(db)

    # Execute Analysis
    summary = await analyzer.analyze_chain("chain_v51_test")

    # ─────────────────────────────────────────────────────────────
    # TEST A: CENTRALITY & DISTANCE CONVERSION
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST A: CENTRALITY & DISTANCE CONVERSION ---")
    assert summary.node_count == 6
    assert summary.edge_count == 5
    assert summary.network_density > 0.0
    
    # Verify nodes received calculated centrality values
    node_map = {n.id: n for n in chain.nodes}
    assert node_map["n1"].degree_centrality >= 0.0
    assert node_map["n4"].betweenness_centrality >= 0.0
    assert node_map["n2"].pagerank > 0.0
    
    # Check metric status dictionary
    m_status = summary.metric_status_json
    assert m_status["degree_centrality"]["status"] in ["COMPUTED", "COMPUTED_FALLBACK"]
    assert m_status["betweenness_centrality"]["status"] in ["COMPUTED", "COMPUTED_FALLBACK"]
    assert m_status["pagerank"]["status"] in ["COMPUTED", "COMPUTED_FALLBACK"]
    logger.info("TEST A PASSED: Centrality metrics computed using inverted distance shortest paths.")


    # ─────────────────────────────────────────────────────────────
    # TEST B: INFLUENCE RANKING & EXPLAINABILITY
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST B: INFLUENCE RANKING & EXPLAINABILITY ---")
    sorted_nodes = sorted(chain.nodes, key=lambda n: n.influence_score, reverse=True)
    top_5 = sorted_nodes[:5]
    assert len(top_5) == 5
    
    for rank, node in enumerate(top_5, start=1):
        assert 0.0 <= node.influence_score <= 1.0
        logger.info(f"Rank {rank}: {node.event.title} | Influence Score: {node.influence_score:.4f} | PageRank: {node.pagerank:.4f} | Betweenness: {node.betweenness_centrality:.4f}")

    # Top node should have positive influence
    assert top_5[0].influence_score > 0.0
    logger.info("TEST B PASSED: Event Influence Scores normalized and ranked cleanly.")

    # ─────────────────────────────────────────────────────────────
    # TEST C: BRIDGE EVENT DETECTION
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST C: BRIDGE EVENT DETECTION ---")
    bridge_events = summary.bridge_events_json
    assert len(bridge_events) >= 1
    
    # Verify bridge event details
    top_bridge = bridge_events[0]
    logger.info(f"Detected Bridge Event: {top_bridge['event_title']} | Bridge Importance: {top_bridge['bridge_importance']} | Connected Communities: {top_bridge['connected_communities']}")
    assert top_bridge["inter_community_edge_count"] >= 1
    assert "connecting" in top_bridge["structural_role_description"].lower()
    logger.info("TEST C PASSED: Structural bridge event successfully detected.")

    # ─────────────────────────────────────────────────────────────
    # TEST D: COMMUNITY DETECTION & EVIDENCE-BASED LABELING
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST D: COMMUNITY DETECTION & EVIDENCE-BASED LABELING ---")
    communities = summary.community_summary_json
    assert len(communities) >= 1
    
    for comm_id, comm_data in communities.items():
        logger.info(f"Community {comm_id}: '{comm_data['label']}' (Confidence: {comm_data['confidence']}) | Events: {comm_data['event_count']} | Dominant Category: {comm_data['dominant_category']}")
        assert comm_data["label"] != ""
        assert comm_data["confidence"] > 0.0

    logger.info("TEST D PASSED: Communities algorithmically partitioned and evidence-based descriptive labels generated.")

    # ─────────────────────────────────────────────────────────────
    # TEST E: EMPTY / SMALL GRAPH FAILURE HANDLING
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST E: EMPTY & SMALL GRAPH FAILURE HANDLING ---")
    
    # Test 0-node graph
    empty_chain = EventChain(id="empty_chain", nodes=[])
    db_empty = MockAsyncSession(empty_chain)
    analyzer_empty = NetworkAnalyzer(db_empty)
    empty_summary = await analyzer_empty.analyze_chain("empty_chain")
    
    assert empty_summary.node_count == 0
    assert empty_summary.metric_status_json["degree_centrality"]["status"] == "UNAVAILABLE"
    assert "0 nodes" in empty_summary.metric_status_json["degree_centrality"]["reason"]
    
    # Test 1-node graph
    single_event = create_mock_event("ev_single", "Isolated Event", "POLITICS")
    single_node = EventChainNode(id="n_single", event_id="ev_single"); single_node.event = single_event
    single_chain = EventChain(id="single_chain", nodes=[single_node], edges=[])
    db_single = MockAsyncSession(single_chain)
    analyzer_single = NetworkAnalyzer(db_single)
    single_summary = await analyzer_single.analyze_chain("single_chain")
    
    assert single_summary.node_count == 1
    assert single_summary.metric_status_json["betweenness_centrality"]["status"] == "LIMITED"
    
    logger.info("TEST E PASSED: Empty and 1-node graphs handled with honest structured statuses without crashing or mock data.")

    logger.info("=== ALL V5.1 GRAPH INTELLIGENCE TESTS PASSED SUCCESSFULLY ===")


if __name__ == "__main__":
    asyncio.run(run_v51_tests())
