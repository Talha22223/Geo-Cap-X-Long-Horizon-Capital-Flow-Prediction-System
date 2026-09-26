"""
Mandatory V5.2 Graph Propagation & Network Exposure Verification Test Suite.
"""
import asyncio
import logging
from datetime import datetime, timezone

from models.event import ExtractedEvent
from models.event_chain import EventChain, EventChainNode, EventChainEdge
from models.exposure import EventExposureResult
from event_chain.propagation import EventPropagationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockAsyncSession:
    def __init__(self, chain: EventChain | None):
        self.chain = chain
        self.saved_exposure: EventExposureResult | None = None

    async def execute(self, stmt):
        stmt_str = str(stmt).lower()
        if "network_analysis_results" in stmt_str:
            item = None
        elif "event_exposure_results" in stmt_str:
            item = self.saved_exposure
        else:
            item = self.chain

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
        return Result(item)

    def add(self, instance):
        if isinstance(instance, EventExposureResult):
            self.saved_exposure = instance

    async def commit(self):
        pass



def create_mock_event(
    id: str,
    title: str,
    category: str,
    sectors: list[str] | None = None,
    countries: list[str] | None = None
) -> ExtractedEvent:
    return ExtractedEvent(
        id=id,
        title=title,
        category=category,
        sectors=sectors or ["FINANCIAL"],
        countries=countries or ["US"],
        regions=["NORTH_AMERICA"],
        organizations=["FEDERAL_RESERVE"],
        event_date=datetime.now(timezone.utc).date(),
        created_at=datetime.now(timezone.utc),
    )


def setup_propagation_test_chain() -> EventChain:
    """
    Sets up a network topology:
    - n1 (Highly Connected Source): Fed Rate Hike [Category: ECONOMIC, Sectors: MONETARY, BANKING, Countries: US]
      - Edge 1 (0.90 conf) -> n2: Treasury Yield Spike [DIRECT, MONETARY]
      - Edge 2 (0.85 conf) -> n3: Tech Sector Selloff [DIRECT, TECH]
      - Edge 3 (0.80 conf) -> n4 (Bridge): USD Currency Surge [DIRECT, CURRENCY, Community 1 -> 2]
    - n2 -> Edge 4 (0.85 conf) -> n5: Mortgage Interest Rate Rise [INDIRECT, REAL_ESTATE]
    - n4 (Bridge) -> Edge 5 (0.75 conf) -> n6: Emerging Market Capital Outflow [INDIRECT, FOREIGN_EXCHANGE, Community 2, Countries: BR, IN]
    - n5 -> Edge 6 (0.80 conf) -> n2 (Cycle loop back to n2 to test cycle safety)
    - n7 (Isolated Event): Local Policy Announcement [No edges]
    - Multiple paths from n1 -> n5:
      Path 1: n1 -> n2 -> n5 (conf 0.90 * 0.85 * 0.85 = 0.65)
      Path 2: n1 -> n3 -> n5 (conf 0.85 * 0.70 * 0.85 = 0.50, if e7 added)
    """
    chain = EventChain(id="chain_v52_test", title="Global Capital Flow Cascade")

    ev1 = create_mock_event("ev_1", "Fed Interest Rate Hike", "ECONOMIC", ["MONETARY", "BANKING"], ["US"])
    ev2 = create_mock_event("ev_2", "US Treasury Yield Spike", "ECONOMIC", ["MONETARY", "DEBT"], ["US"])
    ev3 = create_mock_event("ev_3", "Tech Equities Market Selloff", "MARKET_REACTION", ["TECH"], ["US"])
    ev4 = create_mock_event("ev_4", "USD Exchange Rate Surge", "ECONOMIC", ["CURRENCY", "MONETARY"], ["US", "GLOBAL"])
    ev5 = create_mock_event("ev_5", "Mortgage Interest Rate Rise", "REAL_ESTATE", ["REAL_ESTATE", "BANKING"], ["US"])
    ev6 = create_mock_event("ev_6", "Emerging Market Capital Reallocation", "CAPITAL_FLOW", ["FOREIGN_EXCHANGE"], ["BR", "IN"])
    ev7 = create_mock_event("ev_7", "Isolated Municipal Policy Announcement", "POLITICS", ["LOCAL_GOV"], ["US"])

    n1 = EventChainNode(id="n1", event_id="ev_1", community_id="1", chain_id=chain.id); n1.event = ev1
    n2 = EventChainNode(id="n2", event_id="ev_2", community_id="1", chain_id=chain.id); n2.event = ev2
    n3 = EventChainNode(id="n3", event_id="ev_3", community_id="1", chain_id=chain.id); n3.event = ev3
    n4 = EventChainNode(id="n4", event_id="ev_4", community_id="1", chain_id=chain.id); n4.event = ev4
    n5 = EventChainNode(id="n5", event_id="ev_5", community_id="1", chain_id=chain.id); n5.event = ev5
    n6 = EventChainNode(id="n6", event_id="ev_6", community_id="2", chain_id=chain.id); n6.event = ev6
    n7 = EventChainNode(id="n7", event_id="ev_7", community_id="3", chain_id=chain.id); n7.event = ev7

    chain.nodes = [n1, n2, n3, n4, n5, n6, n7]

    e1 = EventChainEdge(source_node_id="n1", target_node_id="n2", edge_weight=0.9, confidence=0.90, relationship_type="ECONOMIC_TRANSMISSION")
    e2 = EventChainEdge(source_node_id="n1", target_node_id="n3", edge_weight=0.8, confidence=0.85, relationship_type="MARKET_REACTION")
    e3 = EventChainEdge(source_node_id="n1", target_node_id="n4", edge_weight=0.8, confidence=0.80, relationship_type="ECONOMIC_TRANSMISSION")
    
    e4 = EventChainEdge(source_node_id="n2", target_node_id="n5", edge_weight=0.8, confidence=0.85, relationship_type="CAUSAL_CASCADE")
    e5 = EventChainEdge(source_node_id="n4", target_node_id="n6", edge_weight=0.7, confidence=0.75, relationship_type="CROSS_BORDER_TRANSMISSION")
    
    # Cycle back from n5 to n2 to test cycle safety
    e6 = EventChainEdge(source_node_id="n5", target_node_id="n2", edge_weight=0.8, confidence=0.80, relationship_type="FEEDBACK_LOOP")

    # Alternative 2nd path from n3 -> n5
    e7 = EventChainEdge(source_node_id="n3", target_node_id="n5", edge_weight=0.7, confidence=0.70, relationship_type="INDIRECT_IMPACT")

    chain.edges = [e1, e2, e3, e4, e5, e6, e7]
    return chain


async def run_propagation_tests():
    logger.info("=== STARTING V5.2 GRAPH PROPAGATION TEST SUITE ===")

    chain = setup_propagation_test_chain()
    db = MockAsyncSession(chain)
    engine = EventPropagationEngine(db)

    # ─────────────────────────────────────────────────────────────
    # TEST A: HIGHLY CONNECTED EVENT PROPAGATION
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST A: HIGHLY CONNECTED EVENT PROPAGATION ---")
    result_a = await engine.analyze_event_exposure("ev_1", chain_id="chain_v52_test")
    payload_a = result_a.exposure_json

    assert payload_a["composite_exposure_score"] > 0.0
    logger.info(f"Composite Exposure Score for 'ev_1': {payload_a['composite_exposure_score']}")

    direct_events = payload_a["directly_exposed_events"]
    indirect_events = payload_a["indirectly_exposed_events"]
    
    logger.info(f"Directly Exposed Count: {len(direct_events)}, Indirectly Exposed Count: {len(indirect_events)}")
    assert len(direct_events) >= 3  # ev_2, ev_3, ev_4
    assert len(indirect_events) >= 2 # ev_5, ev_6

    # Verify classification labels
    direct_ids = [e["event_id"] for e in direct_events]
    indirect_ids = [e["event_id"] for e in indirect_events]
    assert "ev_2" in direct_ids
    assert "ev_5" in indirect_ids
    logger.info("TEST A PASSED: Direct and Indirect structural exposures properly classified.")

    # ─────────────────────────────────────────────────────────────
    # TEST B: ISOLATED EVENT
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST B: ISOLATED EVENT ---")
    result_b = await engine.analyze_event_exposure("ev_7", chain_id="chain_v52_test")
    payload_b = result_b.exposure_json

    assert payload_b["composite_exposure_score"] == 0.0
    assert len(payload_b["directly_exposed_events"]) == 0
    assert "geocap-x" in payload_b["disclaimer"].lower() or "no qualifying" in payload_b["disclaimer"].lower()
    logger.info("TEST B PASSED: Isolated event honestly returned 0.0 exposure without inventing fake connections.")


    # ─────────────────────────────────────────────────────────────
    # TEST C: WEAK PATH & CONFIDENCE DECAY
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST C: WEAK PATH & CONFIDENCE DECAY ---")
    top_paths = payload_a["top_propagation_paths"]
    assert len(top_paths) >= 2

    # Check hop decay on 2-hop path (n1 -> n2 -> n5)
    # Edge e1 (0.90) * e4 (0.85) * decay 0.85 = 0.65025
    path_2_hop = [p for p in top_paths if p["hops"] == 2 and p["path_nodes"] == ["n1", "n2", "n5"]][0]
    assert path_2_hop["path_confidence"] < (0.90 * 0.85) # Decayed from product
    logger.info(f"2-Hop Path Confidence (Product: 0.765, Decayed: {path_2_hop['path_confidence']})")
    logger.info("TEST C PASSED: Distance/hop decay penalty verified for multi-hop paths.")

    # ─────────────────────────────────────────────────────────────
    # TEST D: MULTIPLE PATHS & NOISY-OR COMBINATION
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST D: MULTIPLE PATHS & NOISY-OR COMBINATION ---")
    # Node n5 (ev_5) is reached via 2 paths: n1->n2->n5 and n1->n3->n5
    ev5_exposure = [e for e in indirect_events if e["event_id"] == "ev_5"][0]
    assert ev5_exposure["path_count"] == 2
    
    # Combined confidence should be greater than single path confidence but <= 1.0
    single_p1 = path_2_hop["path_confidence"]
    combined = ev5_exposure["combined_exposure_confidence"]
    assert combined > single_p1
    assert combined <= 1.0
    logger.info(f"Single Path 1 Confidence: {single_p1}, Combined Noisy-OR Confidence: {combined}")
    logger.info("TEST D PASSED: Multiple alternative paths combined cleanly using Noisy-OR without artificial inflation above 1.0.")

    # ─────────────────────────────────────────────────────────────
    # TEST E: COMMUNITY CROSSING & SECTOR/REGIONAL AGGREGATION
    # ─────────────────────────────────────────────────────────────
    logger.info("--- TEST E: COMMUNITY CROSSING & SECTOR/REGIONAL AGGREGATION ---")
    sectors = payload_a["exposed_sectors"]
    regions = payload_a["exposed_regions"]
    comm_summary = payload_a["community_exposure"]

    assert len(sectors) >= 2
    assert len(regions) >= 1
    logger.info(f"Top Exposed Sector: {sectors[0]['sector']} ({sectors[0]['exposure_score']:.2f})")
    logger.info(f"Top Exposed Region: {regions[0]['region']} ({regions[0]['exposure_score']:.2f})")
    logger.info(f"Community Exposure Summary: {comm_summary['cross_community_propagation_description']}")

    # Verify inter-community reach to Community 2
    assert len(comm_summary["connected_communities"]) >= 1
    logger.info("TEST E PASSED: Sector, regional, and inter-community exposure summaries correctly aggregated.")

    logger.info("=== ALL V5.2 GRAPH PROPAGATION TESTS PASSED SUCCESSFULLY ===")


if __name__ == "__main__":
    asyncio.run(run_propagation_tests())
