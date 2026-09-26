"""
Graph Propagation & Network Exposure Analysis Engine.
Calculates structural exposure, transmission path confidence decay, Noisy-OR multi-path combination,
sector exposure, regional exposure, and community-crossing exposure.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Any
import networkx as nx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.event_chain import EventChain, EventChainNode, EventChainEdge
from models.sna import NetworkAnalysisResult
from models.exposure import EventExposureResult

logger = logging.getLogger(__name__)


class EventPropagationEngine:
    """
    Implements real graph-based network propagation and structural exposure analysis.
    """

    @staticmethod
    def propagate(parent_confidence: float, edge_weight: float, decay_factor: float = 0.8) -> float:
        return round(parent_confidence * edge_weight * decay_factor, 3)

    @staticmethod
    def calculate_path_confidence(path: list[tuple[float, float]]) -> float:
        conf = 1.0
        for p_c, e_w in path:
            conf *= p_c * e_w
        return min(1.0, max(0.0, round(conf, 4)))


    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_event_exposure(self, source_event_id: str, chain_id: str = "Global Capital Flow Cascade", cutoff_depth: int = 4) -> EventExposureResult:
        """
        Calculates network propagation outward from a source canonical event across the event relationship graph.
        """
        logger.info(f"PROPAGATION: Analyzing network exposure for source event {source_event_id} in chain {chain_id}...")

        # 1. Fetch Chain, Nodes, and Edges
        stmt_chain = (
            select(EventChain)
            .where(EventChain.id == chain_id)
            .options(
                selectinload(EventChain.nodes).selectinload(EventChainNode.event),
                selectinload(EventChain.edges)
            )
        )
        res_chain = await self.db.execute(stmt_chain)
        chain = res_chain.scalars().first()

        if not chain:
            # Try fetching by title
            stmt_title = (
                select(EventChain)
                .where(EventChain.title == chain_id)
                .options(
                    selectinload(EventChain.nodes).selectinload(EventChainNode.event),
                    selectinload(EventChain.edges)
                )
            )
            res_title = await self.db.execute(stmt_title)
            chain = res_title.scalars().first()

        if not chain or not chain.nodes:
            logger.warning(f"PROPAGATION: Chain {chain_id} not found or empty.")
            return await self._save_empty_exposure_result(source_event_id, chain_id if chain else "unknown", "Chain not found or has 0 nodes.")

        # 2. Map nodes and locate source node
        node_db_map: dict[str, EventChainNode] = {}
        event_to_node_id: dict[str, str] = {}
        source_node_id = None

        for n in chain.nodes:
            node_db_map[n.id] = n
            event_to_node_id[n.event_id] = n.id
            if n.event_id == source_event_id or n.id == source_event_id:
                source_node_id = n.id

        if not source_node_id or source_node_id not in node_db_map:
            logger.warning(f"PROPAGATION: Source event {source_event_id} not found in graph.")
            return await self._save_empty_exposure_result(source_event_id, chain.id, "Source event not found in network graph.")

        source_node = node_db_map[source_node_id]
        source_event = source_node.event

        # 3. Build NetworkX DiGraph
        G = nx.DiGraph()
        for n in chain.nodes:
            G.add_node(n.id, event_id=n.event_id)

        for edge in chain.edges:
            w = float(edge.edge_weight) if edge.edge_weight else 1.0
            conf = float(edge.confidence) if edge.confidence else 1.0
            rel_type = edge.relationship_type or "ASSOCIATIVE"
            evidence = edge.evidence or {}
            G.add_edge(
                edge.source_node_id,
                edge.target_node_id,
                weight=w,
                confidence=conf,
                relationship_type=rel_type,
                evidence=evidence
            )

        # Fetch latest SNA result for community lookup
        stmt_sna = select(NetworkAnalysisResult).where(NetworkAnalysisResult.chain_id == chain.id).order_by(NetworkAnalysisResult.created_at.desc())
        res_sna = await self.db.execute(stmt_sna)
        sna_result = res_sna.scalars().first()

        community_summary = sna_result.community_summary_json if sna_result else {}
        bridge_events_list = sna_result.bridge_events_json if sna_result else []

        source_community = source_node.community_id or "0"

        # 4. Traversal & Path Propagation
        # Find all simple paths from source_node_id up to cutoff_depth
        all_target_paths: dict[str, list[dict]] = {}

        for target_node_id in G.nodes:
            if target_node_id == source_node_id:
                continue

            try:
                simple_paths = list(nx.all_simple_paths(G, source_node_id, target_node_id, cutoff=cutoff_depth))
            except Exception:
                simple_paths = []

            for path in simple_paths:
                path_length = len(path) - 1
                edge_confidences = []
                steps = []

                for i in range(len(path) - 1):
                    u, v = path[i], path[i+1]
                    edge_data = G.get_edge_data(u, v)
                    c_val = float(edge_data.get("confidence", 0.80))
                    r_type = edge_data.get("relationship_type", "TRANSMISSION")
                    edge_confidences.append(c_val)
                    steps.append({
                        "source_node_id": u,
                        "target_node_id": v,
                        "relationship_type": r_type,
                        "confidence": round(c_val, 4)
                    })

                # Calculate Path Confidence with hop decay (0.85 per hop beyond 1st)
                product_conf = 1.0
                for c_val in edge_confidences:
                    product_conf *= c_val

                decay_factor = (0.85 ** (path_length - 1)) if path_length > 1 else 1.0
                path_conf = product_conf * decay_factor

                path_detail = {
                    "path_nodes": path,
                    "target_node_id": target_node_id,
                    "hops": path_length,
                    "path_confidence": round(path_conf, 4),
                    "steps": steps,
                    "explanation": f"Path of {path_length} hop(s) with aggregate confidence {path_conf:.4f}."
                }
                all_target_paths.setdefault(target_node_id, []).append(path_detail)

        # 5. Multi-Path Noisy-OR Combination & Target Exposure Classification
        exposed_events: list[dict] = []
        sector_path_confidences: dict[str, list[float]] = {}
        regional_path_confidences: dict[str, list[float]] = {}
        connected_communities: set[str] = set()

        for target_node_id, paths in all_target_paths.items():
            db_target = node_db_map.get(target_node_id)
            if not db_target or not db_target.event:
                continue

            target_ev = db_target.event

            # Sort paths for target by confidence descending
            paths.sort(key=lambda p: p["path_confidence"], reverse=True)
            strongest_path = paths[0]

            # Noisy-OR combination across independent paths: 1 - Product(1 - P_i)
            inv_prod = 1.0
            for p in paths:
                inv_prod *= (1.0 - p["path_confidence"])
            combined_conf = round(1.0 - inv_prod, 4)

            # Minimum threshold for inclusion
            if combined_conf < 0.05:
                continue

            # Direct vs Indirect Classification
            has_direct_edge = G.has_edge(source_node_id, target_node_id)
            min_hops = min(p["hops"] for p in paths)

            if has_direct_edge and combined_conf >= 0.45:
                exposure_level = "DIRECT"
            elif min_hops >= 2 and combined_conf >= 0.25:
                exposure_level = "INDIRECT"
            elif combined_conf >= 0.10:
                exposure_level = "LOW CONFIDENCE"
            else:
                exposure_level = "NO MEANINGFUL EXPOSURE"

            if exposure_level == "NO MEANINGFUL EXPOSURE":
                continue

            exposed_events.append({
                "node_id": target_node_id,
                "event_id": db_target.event_id,
                "event_title": target_ev.title,
                "category": target_ev.category or "ECONOMIC",
                "exposure_level": exposure_level,
                "combined_exposure_confidence": combined_conf,
                "min_hops": min_hops,
                "path_count": len(paths),
                "strongest_path": strongest_path,
                "explanation": f"Structural exposure classified as {exposure_level} with combined confidence {combined_conf:.2f} across {len(paths)} path(s)."
            })

            # Sector aggregation
            if target_ev.sectors and isinstance(target_ev.sectors, list):
                for sec in target_ev.sectors:
                    sector_path_confidences.setdefault(sec.upper(), []).append(combined_conf)

            # Regional aggregation
            regions_list = []
            if target_ev.countries and isinstance(target_ev.countries, list):
                regions_list.extend(target_ev.countries)
            if target_ev.regions and isinstance(target_ev.regions, list):
                regions_list.extend(target_ev.regions)

            for reg in set(regions_list):
                regional_path_confidences.setdefault(reg.upper(), []).append(combined_conf)

            # Community tracking
            target_comm = db_target.community_id or "0"
            if target_comm != source_community:
                connected_communities.add(target_comm)

        # Separate Direct and Indirect exposed lists
        direct_events = [e for e in exposed_events if e["exposure_level"] == "DIRECT"]
        indirect_events = [e for e in exposed_events if e["exposure_level"] == "INDIRECT"]
        low_conf_events = [e for e in exposed_events if e["exposure_level"] == "LOW CONFIDENCE"]

        # 6. Sector Exposure Summary (Noisy-OR combined)
        sector_exposure_list = []
        for sec, conf_list in sector_path_confidences.items():
            inv_p = 1.0
            for c in conf_list:
                inv_p *= (1.0 - c)
            sec_conf = round(1.0 - inv_p, 4)
            explanation = f"{sec.title()} sector is structurally exposed ({sec_conf:.2f} confidence) across {len(conf_list)} connected event path(s)."
            sector_exposure_list.append({
                "sector": sec,
                "exposure_score": sec_conf,
                "event_count": len(conf_list),
                "explanation": explanation
            })
        sector_exposure_list.sort(key=lambda x: x["exposure_score"], reverse=True)

        # 7. Regional Exposure Summary (Noisy-OR combined)
        regional_exposure_list = []
        for reg, conf_list in regional_path_confidences.items():
            inv_p = 1.0
            for c in conf_list:
                inv_p *= (1.0 - c)
            reg_conf = round(1.0 - inv_p, 4)
            explanation = f"Geographic region/country {reg} shows structural network exposure ({reg_conf:.2f} confidence) via {len(conf_list)} connected event(s)."
            regional_exposure_list.append({
                "region": reg,
                "exposure_score": reg_conf,
                "event_count": len(conf_list),
                "explanation": explanation
            })
        regional_exposure_list.sort(key=lambda x: x["exposure_score"], reverse=True)

        # 8. Community Exposure Summary
        traversed_bridges = []
        for b in bridge_events_list:
            if b.get("node_id") in all_target_paths or b.get("node_id") == source_node_id:
                traversed_bridges.append(b.get("event_title", "Bridge Event"))

        comm_label_map = {cid: cdata.get("label", f"Community {cid}") for cid, cdata in community_summary.items()}
        primary_label = comm_label_map.get(source_community, f"Community {source_community}")
        connected_labels = [comm_label_map.get(c, f"Community {c}") for c in connected_communities]

        cross_comm_desc = (
            f"Source event primary cluster is '{primary_label}'. "
            f"Structural propagation reaches {len(connected_communities)} external community cluster(s) "
            f"({', '.join(connected_labels[:2])}) via {len(traversed_bridges)} bridge event(s)."
        )

        community_exposure_summary = {
            "primary_community": primary_label,
            "connected_communities": connected_labels,
            "bridge_events_traversed": traversed_bridges,
            "cross_community_propagation_description": cross_comm_desc
        }

        # 9. Top Propagation Paths
        all_flat_paths = []
        for target_id, plist in all_target_paths.items():
            all_flat_paths.extend(plist)
        all_flat_paths.sort(key=lambda p: p["path_confidence"], reverse=True)
        top_propagation_paths = all_flat_paths[:10]

        # 10. Composite Network Exposure Score Formula
        max_target_conf = max([e["combined_exposure_confidence"] for e in exposed_events], default=0.0)
        direct_count = len(direct_events)
        indirect_count = len(indirect_events)

        raw_exposure_score = (
            0.40 * max_target_conf +
            0.30 * min(1.0, direct_count / 5.0) +
            0.20 * min(1.0, indirect_count / 10.0) +
            0.10 * min(1.0, len(connected_communities) / 3.0)
        )
        composite_exposure_score = round(min(1.0, float(raw_exposure_score)), 4)

        disclaimer = (
            "This score represents structural exposure inside the GEOCAP-X event relationship network. "
            "It does NOT represent a real-world financial forecast, asset price prediction, or proven capital flow causation."
        )

        # 11. Build Exposure JSON Payload
        exposure_payload = {
            "source_event_id": source_event_id,
            "source_event_title": source_event.title if source_event else "Unknown Event",
            "source_category": source_event.category if source_event else "ECONOMIC",
            "composite_exposure_score": composite_exposure_score,
            "directly_exposed_events": direct_events,
            "indirectly_exposed_events": indirect_events,
            "low_confidence_events": low_conf_events,
            "exposed_sectors": sector_exposure_list,
            "exposed_regions": regional_exposure_list,
            "community_exposure": community_exposure_summary,
            "top_propagation_paths": top_propagation_paths,
            "disclaimer": disclaimer
        }

        metadata = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "graph_scope": f"Network Exposure Analysis for {source_event_id}",
            "cutoff_depth": cutoff_depth,
            "total_nodes_evaluated": len(G.nodes),
            "algorithm_version": "V5.2 Graph Propagation & Exposure Engine",
            "configuration_version": "5.2.0"
        }

        # 12. Save result in DB
        stmt_exp = select(EventExposureResult).where(
            EventExposureResult.chain_id == chain.id,
            EventExposureResult.source_event_id == source_event_id
        )
        res_exp = await self.db.execute(stmt_exp)
        exp_record = res_exp.scalars().first()

        if not exp_record:
            exp_record = EventExposureResult(chain_id=chain.id, source_event_id=source_event_id)
            self.db.add(exp_record)

        exp_record.exposure_score = composite_exposure_score
        exp_record.exposure_json = exposure_payload
        exp_record.metadata_json = metadata

        await self.db.commit()
        logger.info(f"PROPAGATION: Analysis complete for {source_event_id}. Exposure Score: {composite_exposure_score}, Direct: {len(direct_events)}, Indirect: {len(indirect_events)}")
        return exp_record

    async def _save_empty_exposure_result(self, source_event_id: str, chain_id: str, reason: str) -> EventExposureResult:
        """Creates an honest empty/isolated exposure result."""
        stmt_exp = select(EventExposureResult).where(
            EventExposureResult.chain_id == chain_id,
            EventExposureResult.source_event_id == source_event_id
        )
        res_exp = await self.db.execute(stmt_exp)
        exp_record = res_exp.scalars().first()

        if not exp_record:
            exp_record = EventExposureResult(chain_id=chain_id, source_event_id=source_event_id)
            self.db.add(exp_record)

        empty_payload = {
            "source_event_id": source_event_id,
            "source_event_title": "Isolated or Unknown Event",
            "source_category": "UNKNOWN",
            "composite_exposure_score": 0.0,
            "directly_exposed_events": [],
            "indirectly_exposed_events": [],
            "low_confidence_events": [],
            "exposed_sectors": [],
            "exposed_regions": [],
            "community_exposure": {
                "primary_community": "Unclassified",
                "connected_communities": [],
                "bridge_events_traversed": [],
                "cross_community_propagation_description": "Event is isolated or not present in event graph."
            },
            "top_propagation_paths": [],
            "disclaimer": "This event has no qualifying propagation paths in the GEOCAP-X event graph."
        }

        exp_record.exposure_score = 0.0
        exp_record.exposure_json = empty_payload
        exp_record.metadata_json = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "graph_scope": "Empty Propagation Analysis",
            "reason": reason
        }

        await self.db.commit()
        return exp_record


ConfidencePropagator = EventPropagationEngine

