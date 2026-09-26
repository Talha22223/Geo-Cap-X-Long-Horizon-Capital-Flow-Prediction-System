"""
Tests for Capital Flow prediction and horizons.
"""
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from capital_flow.engine import CapitalFlowEngine
from capital_flow.horizons import HorizonAggregator
from capital_flow.scenarios import ScenarioGenerator
from capital_flow.explainer import ExplainabilityService
from models.event import ExtractedEvent, RawEvent, EventEntity
from models.capital_flow import CapitalFlowPrediction


@pytest.mark.asyncio
async def test_capital_flow_predictions(db: AsyncSession):
    # Seed events with monetary policy rate hikes
    pub = datetime.now(timezone.utc)
    
    raw = RawEvent(source_id="seed", source_type="SEED", title="Fed Hikes", body="Federal Reserve raises interest rates by 75 basis points.", content_hash="hash-predict", published_at=pub)
    db.add(raw)
    await db.flush()

    ext = ExtractedEvent(
        raw_event_id=raw.id, title="Fed Hikes", body="Federal Reserve raises interest rates by 75 basis points.",
        countries=["United States"], regions=["North America"], sectors=["Financial Services"], currency="USD", asset_classes=["BOND"],
        category="MONETARY_POLICY", sentiment="BULLISH", severity=0.8,
        extraction_confidence=0.9, classification_confidence=0.9, overall_confidence=0.9,
        event_date=pub.date()
    )
    db.add(ext)
    await db.flush()

    db.add(EventEntity(event_id=ext.id, entity_type="country", entity_value="United States"))
    await db.commit()

    # Generate predictions
    engine = CapitalFlowEngine(db)
    preds = await engine.generate_predictions_for_events([ext.id])

    assert len(preds) == 4  # 4 horizons (6M, 1Y, 3Y, 5Y)
    
    # Assert fields on prediction
    p = preds[0]
    assert p.affected_country == "United States"
    assert p.direction == "INFLOW"
    assert p.overall_confidence > 0.6
    assert p.risk_level in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert p.estimated_rotation_usd_bn > 0.0

    # Retrieve from DB to verify relations
    stmt = (
        select(CapitalFlowPrediction)
        .where(CapitalFlowPrediction.id == p.id)
        .options(
            selectinload(CapitalFlowPrediction.evidence),
            selectinload(CapitalFlowPrediction.alternative_scenarios)
        )
    )
    res = await db.execute(stmt)
    db_p = res.scalars().first()
    assert db_p is not None
    assert len(db_p.evidence) == 1
    assert len(db_p.alternative_scenarios) == 3


def test_horizon_scaling():
    base = 10.0
    s6m = HorizonAggregator.scale_rotation(base, "SIX_MONTHS")
    s5y = HorizonAggregator.scale_rotation(base, "FIVE_YEARS")
    assert s6m > s5y


def test_scenarios():
    scenarios = ScenarioGenerator.generate("INFLOW", 12.0, 0.8)
    assert len(scenarios) == 3
    assert any(s["label"] == "Bull Case" for s in scenarios)
    assert sum(s["probability"] for s in scenarios) == pytest.approx(1.0, 0.02)
