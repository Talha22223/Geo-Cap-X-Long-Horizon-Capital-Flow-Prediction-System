"""
Multi-Horizon Forecast Orchestrator (V7.1 Engine).
Wires Event Intelligence, Network Exposure, Market Evidence, and Historical Analogue Engine
into persistent multi-horizon scenario forecasts.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.event import ExtractedEvent
from models.forecast import MultiHorizonForecast, ForecastScenarioModel, ForecastAnalogueModel
from capital_flow.contracts import (
    ForecastInputContract,
    EventEvidenceInput,
    NetworkEvidenceInput,
    MarketEvidenceInput,
    HistoricalEvidenceInput,
    DataQualityInput,
    EvidenceState
)
from capital_flow.historical_analogues import HistoricalAnalogueEngine
from capital_flow.scenario_engine import ScenarioEngine
from capital_flow.event_mapping import EventAssetMapper
from capital_flow.event_window import EventWindowAnalyzer
from providers.financial.yfinance_provider import RealYahooFinanceProvider

logger = logging.getLogger(__name__)


class ForecastOrchestrator:
    """
    Main orchestration engine for GEOCAP-X V7.1 Multi-Horizon Scenario Intelligence.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.yf_provider = RealYahooFinanceProvider()

    async def generate_forecast_for_event(
        cls_self,
        event_id: str,
        horizons: list[str] | None = None
    ) -> list[MultiHorizonForecast]:
        """
        Build evidence-backed multi-horizon scenario forecast for canonical event.
        """
        if horizons is None:
            horizons = ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"]

        stmt = (
            select(ExtractedEvent)
            .where(ExtractedEvent.id == event_id)
            .options(
                selectinload(ExtractedEvent.entities),
                selectinload(ExtractedEvent.chain_node)
            )
        )
        res = await cls_self.db.execute(stmt)
        ev = res.scalars().first()

        if not ev:
            logger.error(f"ForecastOrchestrator: Event '{event_id}' not found.")
            return []

        # 1. Event Evidence Input
        ev_dt = datetime.combine(ev.event_date, datetime.min.time(), tzinfo=timezone.utc) if ev.event_date else datetime.now(timezone.utc)
        event_input = EventEvidenceInput(
            event_id=ev.id,
            title=ev.title,
            category=ev.category,
            severity=ev.severity,
            confidence=ev.overall_confidence,
            timestamp=ev_dt,
            countries=ev.countries or [],
            regions=ev.regions or [],
            sectors=ev.sectors or [],
            organizations=ev.organizations or [],
            sentiment=ev.sentiment,
            state=EvidenceState.AVAILABLE
        )

        # 2. Network Evidence Input (from Chain Node)
        network_input = NetworkEvidenceInput(state=EvidenceState.UNAVAILABLE)
        if ev.chain_node:
            node = ev.chain_node
            degree_count = max(1, int(node.degree_centrality * 10))
            network_input = NetworkEvidenceInput(
                network_exposure_score=round(node.degree_centrality or node.influence_score or 0.50, 4),
                relationship_confidence=0.85,
                directly_exposed_count=degree_count,
                indirectly_exposed_count=node.depth * 2,
                top_propagation_paths=[{"path_summary": f"Chain Depth {node.depth}, Degree Centrality {node.degree_centrality:.2f}"}],
                bridge_events_traversed=[f"Node_{node.id[:6]}"],
                state=EvidenceState.AVAILABLE
            )

        # 3. Market Evidence Input
        mappings = EventAssetMapper.map_event_to_instruments(ev)
        target_symbol = mappings[0]["instrument_symbol"] if mappings else None
        asset_class = mappings[0]["asset_class"] if mappings else "EQUITY"

        market_input = MarketEvidenceInput(
            instrument_symbol=target_symbol,
            asset_class=asset_class,
            state=EvidenceState.UNAVAILABLE
        )

        observations: list[dict] = []
        z_score: float | None = None

        if target_symbol:
            observations = await cls_self.yf_provider.get_observations(target_symbol, limit=90)
            if observations:
                window_res = EventWindowAnalyzer.analyze_window(ev_dt, observations)
                z_score = window_res.get("abnormality_z_score")

                market_input = MarketEvidenceInput(
                    instrument_symbol=target_symbol,
                    asset_class=asset_class,
                    observed_return=observations[-1].get("close_price", 0.0),
                    abnormal_z_score=z_score,
                    volume=observations[-1].get("volume", 0.0),
                    historical_observation_count=len(observations),
                    state=EvidenceState.AVAILABLE if len(observations) >= 10 else EvidenceState.INSUFFICIENT
                )

        # 4. Historical Analogue Input
        historical_input = HistoricalAnalogueEngine.find_analogues(
            event=event_input,
            asset_class=asset_class
        )

        # 5. Data Quality Input
        data_quality_input = DataQualityInput(
            freshness_seconds=0.0,
            completeness_score=1.0 if (market_input.state == EvidenceState.AVAILABLE and historical_input.state == EvidenceState.AVAILABLE) else 0.75,
            source_quality_score=0.90,
            historical_sample_size=len(observations),
            independent_sources_count=1 + (1 if market_input.state == EvidenceState.AVAILABLE else 0),
            state=EvidenceState.AVAILABLE
        )

        # Construct Master Forecast Input Contract
        input_contract = ForecastInputContract(
            event=event_input,
            network=network_input,
            market=market_input,
            historical=historical_input,
            data_quality=data_quality_input
        )

        # Base magnitude calculation
        obs_volume = observations[-1]["volume"] if observations and observations[-1].get("volume") else 1.0e8
        base_magnitude = round(min(100.0, (obs_volume / 1.0e9) * (1.0 + abs(z_score if z_score else 0.5))), 2)

        persisted_forecasts: list[MultiHorizonForecast] = []

        # Execute Scenario Engine per requested horizon
        for hz_key in horizons:
            scenario_res = ScenarioEngine.generate_scenarios_for_horizon(
                horizon_key=hz_key,
                input_contract=input_contract,
                base_magnitude=base_magnitude
            )

            # Persist Forecast Result
            forecast_rec = MultiHorizonForecast(
                event_id=ev.id,
                horizon=hz_key,
                status=scenario_res["status"],
                confidence_state=scenario_res.get("confidence_state", "UNCONFIRMED_EVENT_SIGNAL"),
                overall_confidence=scenario_res.get("overall_forecast_confidence", 0.0),
                estimated_rotation_usd_bn=base_magnitude if scenario_res["status"] == "SUFFICIENT_EVIDENCE" else 0.0,
                affected_country=ev.countries[0] if ev.countries else None,
                affected_region=ev.regions[0] if ev.regions else None,
                affected_sector=ev.sectors[0] if ev.sectors else None,
                asset_class=asset_class,
                primary_sensitivity_driver=scenario_res.get("sensitivity", {}).get("primary_sensitivity_driver") if scenario_res.get("sensitivity") else None,
                methodology_version="v7.1",
                data_snapshot_json=input_contract.get_summary_dict(),
                sensitivity_json=scenario_res.get("sensitivity")
            )
            cls_self.db.add(forecast_rec)
            await cls_self.db.flush()

            # Persist Scenarios
            for sc in scenario_res.get("scenarios", []):
                sc_rec = ForecastScenarioModel(
                    forecast_id=forecast_rec.id,
                    scenario_type=sc["type"],
                    title=sc["title"],
                    description=sc["description"],
                    assumptions_json=sc["assumptions"],
                    supporting_evidence_json=sc["supporting_evidence"],
                    opposing_evidence_json=sc["opposing_evidence"],
                    affected_sectors_assets_json=sc["affected_sectors_assets"],
                    relevant_network_paths_json=sc["relevant_network_paths"],
                    uncertainty=sc["uncertainty"],
                    scenario_confidence=sc["scenario_confidence"]
                )
                cls_self.db.add(sc_rec)

            # Persist Analogues
            for a in historical_input.matched_analogues:
                a_rec = ForecastAnalogueModel(
                    forecast_id=forecast_rec.id,
                    historical_event_title=a["title"],
                    historical_date=a["date"],
                    similarity_score=a["similarity_score"],
                    similarity_method=a["similarity_method"],
                    matching_attributes_json=a["matching_attributes"],
                    observed_outcome=a["observed_outcome"],
                    source=a["source"]
                )
                cls_self.db.add(a_rec)

            persisted_forecasts.append(forecast_rec)

        await cls_self.db.commit()

        # Re-query persisted forecasts with selectinload for safe async relationship access
        forecast_ids = [f.id for f in persisted_forecasts]
        stmt_out = (
            select(MultiHorizonForecast)
            .where(MultiHorizonForecast.id.in_(forecast_ids))
            .options(
                selectinload(MultiHorizonForecast.scenarios),
                selectinload(MultiHorizonForecast.analogues)
            )
        )
        res_out = await cls_self.db.execute(stmt_out)
        result_forecasts = res_out.scalars().all()

        logger.info(f"ForecastOrchestrator: Generated {len(result_forecasts)} multi-horizon forecasts for event '{ev.title}'.")
        return list(result_forecasts)
