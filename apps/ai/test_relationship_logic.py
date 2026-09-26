"""
Tests for the V4.1 Causal Relationship Engine.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

# Mock the database setup, or just construct events manually for testing logic
from models.event import ExtractedEvent, EventEntity
from event_chain.relationship import RelationshipScorer
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_mock_event(id: str, title: str, summary: str, category: str, date_str: str, entities_info: list, conf: float) -> ExtractedEvent:
    ev = ExtractedEvent(
        id=id,
        title=title,
        summary=summary,
        category=category,
        event_date=datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc),
        created_at=datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc),
        extraction_confidence=conf,
        classification_confidence=conf,
        overall_confidence=conf
    )
    ev.entities = [
        EventEntity(entity_type=typ, entity_value=val) for typ, val in entities_info
    ]
    return ev

async def run_tests():
    scorer = RelationshipScorer()
    
    # ----------------------------------------------------
    # TEST A — CLEARLY RELATED EVENTS
    # ----------------------------------------------------
    # Central Bank hikes rates -> Bond Yields spike
    logger.info("--- TEST A: CLEARLY RELATED EVENTS ---")
    ev_a1 = create_mock_event(
        id="a1",
        title="Fed Hikes Interest Rates by 50 Bps",
        summary="The Federal Reserve increased its benchmark policy rate today to curb inflation.",
        category="Central Bank Action",
        date_str="2023-05-01T10:00:00",
        entities_info=[("ORG", "Federal Reserve"), ("GPE", "United States")],
        conf=0.9
    )
    
    ev_a2 = create_mock_event(
        id="a2",
        title="US Treasury Yields Surge Following Rate Hike",
        summary="The 10-year Treasury bond yield surged past 4% after the Fed's aggressive move.",
        category="Bond Yield",
        date_str="2023-05-01T14:00:00",
        entities_info=[("ORG", "Federal Reserve"), ("GPE", "United States"), ("COMMODITY", "Treasury bond")],
        conf=0.9
    )
    
    res_a = scorer.evaluate(ev_a1, ev_a2)
    logger.info(f"Test A Score: {res_a.score}")
    logger.info(f"Test A Type: {res_a.relationship_type}")
    logger.info(f"Test A Evidence: {res_a.evidence}")
    assert res_a.relationship_type in ("ECONOMIC_TRANSMISSION", "POLICY_RESPONSE", "MARKET_REACTION", "HIGH_CONFIDENCE_RELATION")
    assert res_a.score >= settings.RELATIONSHIP_THRESHOLD_STRONG
    
    # ----------------------------------------------------
    # TEST B — SHARED ENTITY BUT UNRELATED
    # ----------------------------------------------------
    logger.info("--- TEST B: SHARED ENTITY BUT UNRELATED ---")
    ev_b1 = create_mock_event(
        id="b1",
        title="US President Visits Local Tech Factory",
        summary="The President toured a semiconductor plant in Ohio.",
        category="Politics",
        date_str="2023-06-01T10:00:00",
        entities_info=[("GPE", "United States")],
        conf=0.9
    )
    
    ev_b2 = create_mock_event(
        id="b2",
        title="US Corn Crop Yields Exceed Expectations",
        summary="Favorable weather led to a record corn harvest in the Midwest.",
        category="Agriculture",
        date_str="2023-06-05T10:00:00",
        entities_info=[("GPE", "United States"), ("COMMODITY", "Corn")],
        conf=0.9
    )
    
    res_b = scorer.evaluate(ev_b1, ev_b2)
    logger.info(f"Test B Score: {res_b.score}")
    logger.info(f"Test B Type: {res_b.relationship_type}")
    assert res_b.score < settings.RELATIONSHIP_THRESHOLD_STRONG, "Should not be a strong relationship"
    
    # ----------------------------------------------------
    # TEST C — TEMPORALLY CLOSE BUT UNRELATED
    # ----------------------------------------------------
    logger.info("--- TEST C: TEMPORALLY CLOSE BUT UNRELATED ---")
    ev_c1 = create_mock_event(
        id="c1",
        title="Japan Central Bank Keeps Rates Steady",
        summary="BOJ maintains ultra-loose monetary policy.",
        category="Central Bank Action",
        date_str="2023-07-01T09:00:00",
        entities_info=[("ORG", "Bank of Japan"), ("GPE", "Japan")],
        conf=0.9
    )
    
    ev_c2 = create_mock_event(
        id="c2",
        title="Brazil Approves New Tax Reform Bill",
        summary="The lower house in Brazil approved a massive overhaul of the tax system.",
        category="Fiscal Policy",
        date_str="2023-07-01T10:00:00",
        entities_info=[("GPE", "Brazil")],
        conf=0.9
    )
    
    res_c = scorer.evaluate(ev_c1, ev_c2)
    logger.info(f"Test C Score: {res_c.score}")
    logger.info(f"Test C Type: {res_c.relationship_type}")
    assert res_c.score < settings.RELATIONSHIP_THRESHOLD_WEAK, "Should be unrelated despite temporal proximity"
    
    # ----------------------------------------------------
    # TEST D — MULTIPLE RELATIONSHIP PATH
    # ----------------------------------------------------
    logger.info("--- TEST D: MULTIPLE RELATIONSHIP PATH ---")
    # Event 1: Sanction -> Event 2: Trade Restriction -> Event 3: Supply Shortage
    ev_d1 = create_mock_event(
        id="d1",
        title="EU Imposes Sanctions on Russian Oil",
        summary="New sanctions restrict the import of Russian crude.",
        category="Sanction",
        date_str="2023-08-01T00:00:00",
        entities_info=[("ORG", "EU"), ("GPE", "Russia"), ("COMMODITY", "Oil")],
        conf=0.9
    )
    
    ev_d2 = create_mock_event(
        id="d2",
        title="Oil Shipping Routes Disrupted",
        summary="Major shipping lines halt operations in the Baltic due to sanctions.",
        category="Trade Restriction",
        date_str="2023-08-03T00:00:00",
        entities_info=[("GPE", "Russia"), ("COMMODITY", "Oil")],
        conf=0.9
    )
    
    ev_d3 = create_mock_event(
        id="d3",
        title="European Energy Prices Spike on Supply Fears",
        summary="Energy markets rally as crude oil supply shortages loom over Europe.",
        category="Commodity Price",
        date_str="2023-08-05T00:00:00",
        entities_info=[("ORG", "EU"), ("COMMODITY", "Oil"), ("COMMODITY", "Energy")],
        conf=0.9
    )
    
    res_d1_d2 = scorer.evaluate(ev_d1, ev_d2)
    res_d2_d3 = scorer.evaluate(ev_d2, ev_d3)
    logger.info(f"Test D1->D2 Score: {res_d1_d2.score}, Type: {res_d1_d2.relationship_type}")
    logger.info(f"Test D2->D3 Score: {res_d2_d3.score}, Type: {res_d2_d3.relationship_type}")
    
    assert res_d1_d2.score >= settings.RELATIONSHIP_THRESHOLD_WEAK
    assert res_d2_d3.score >= settings.RELATIONSHIP_THRESHOLD_WEAK

    logger.info("ALL TESTS PASSED.")

if __name__ == "__main__":
    asyncio.run(run_tests())
