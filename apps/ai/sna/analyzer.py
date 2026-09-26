"""
Social Network Analysis (SNA) & Advanced Graph Intelligence Engine.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
import networkx as nx
import community as community_louvain
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.event_chain import EventChain, EventChainNode, EventChainEdge
from models.sna import NetworkAnalysisResult
from config import settings

logger = logging.getLogger(__name__)


class NetworkAnalyzer:
    """
    Implements advanced SNA centrality, explainable influence scoring,
    evidence-based community detection, and bridge event identification over event causal graphs.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def analyze_chain(self, chain_id: str) -> NetworkAnalysisResult:
        """
        Build a NetworkX DiGraph from database, compute topological SNA metrics,
        generate explainable influence scores, detect communities, identify bridge events,
        and store snapshot metadata.
        """
        logger.info(f"SNA: Running graph intelligence analysis on chain {chain_id}...")

        # 1. Fetch chain, nodes, and edges
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

        if not chain or not chain.nodes:
            logger.warning(f"SNA: Chain {chain_id} is empty or not found.")
            return await self._save_empty_result(chain_id, reason="Chain is empty or has 0 nodes.")

        # 2. Build NetworkX DiGraph with proper distance & weight handling
        G = nx.DiGraph()
        node_db_map: dict[str, EventChainNode] = {}
        for node in chain.nodes:
            node_db_map[node.id] = node
            G.add_node(node.id, event_id=node.event_id)


        for edge in chain.edges:
            w = float(edge.edge_weight) if edge.edge_weight else 1.0
            conf = float(edge.confidence) if edge.confidence else 1.0
            # Distance is inversely proportional to relationship strength & confidence.
            # Short distance = strong/high-confidence path for shortest path algorithms like Betweenness.
            dist = 1.0 / max(w * conf, 0.001)
            G.add_edge(
                edge.source_node_id,
                edge.target_node_id,
                weight=w,
                confidence=conf,
                distance=dist
            )

        N = G.number_of_nodes()
        E = G.number_of_edges()

        if N == 0:
            return await self._save_empty_result(chain_id, reason="Graph contains 0 nodes.")

        G_undirected = G.to_undirected()

        # Dictionary to track per-metric execution statuses
        metric_statuses: dict[str, dict] = {}

        # 3. Compute Centrality Measures & Handle Failure Scenarios
        
        # A. Degree Centrality
        try:
            degree_cent = nx.degree_centrality(G)
            metric_statuses["degree_centrality"] = {
                "status": "COMPUTED",
                "reason": "Successfully computed degree centrality.",
                "algorithm": "nx.degree_centrality"
            }
        except Exception as e:
            logger.warning(f"Degree centrality calculation error: {e}")
            degree_cent = {n: 0.0 for n in G.nodes}
            metric_statuses["degree_centrality"] = {
                "status": "UNAVAILABLE",
                "reason": f"Calculation failed: {str(e)}",
                "algorithm": "nx.degree_centrality"
            }

        # B. Betweenness Centrality (Uses inverted distance attribute)
        try:
            if N <= 1:
                betweenness_cent = {n: 0.0 for n in G.nodes}
                metric_statuses["betweenness_centrality"] = {
                    "status": "LIMITED",
                    "reason": "Graph contains <= 1 node; betweenness centrality is 0.",
                    "algorithm": "nx.betweenness_centrality"
                }
            else:
                betweenness_cent = nx.betweenness_centrality(G, weight="distance")
                metric_statuses["betweenness_centrality"] = {
                    "status": "COMPUTED",
                    "reason": "Successfully computed shortest-path betweenness using inverted edge confidence distance.",
                    "algorithm": "nx.betweenness_centrality"
                }
        except Exception as e:
            logger.warning(f"Betweenness centrality calculation error: {e}")
            betweenness_cent = {n: 0.0 for n in G.nodes}
            metric_statuses["betweenness_centrality"] = {
                "status": "UNAVAILABLE",
                "reason": f"Calculation failed: {str(e)}",
                "algorithm": "nx.betweenness_centrality"
            }

        # C. Closeness Centrality (Uses distance attribute)
        try:
            if N <= 1:
                closeness_cent = {n: 0.0 for n in G.nodes}
                metric_statuses["closeness_centrality"] = {
                    "status": "LIMITED",
                    "reason": "Graph contains <= 1 node; closeness centrality is 0.",
                    "algorithm": "nx.closeness_centrality"
                }
            else:
                closeness_cent = nx.closeness_centrality(G, distance="distance")
                metric_statuses["closeness_centrality"] = {
                    "status": "COMPUTED",
                    "reason": "Successfully computed closeness centrality.",
                    "algorithm": "nx.closeness_centrality"
                }
        except Exception as e:
            logger.warning(f"Closeness centrality calculation error: {e}")
            closeness_cent = {n: 0.0 for n in G.nodes}
            metric_statuses["closeness_centrality"] = {
                "status": "UNAVAILABLE",
                "reason": f"Calculation failed: {str(e)}",
                "algorithm": "nx.closeness_centrality"
            }

        # D. Eigenvector Centrality
        try:
            if N <= 1 or E == 0:
                eigen_cent = {n: 0.0 for n in G.nodes}
                metric_statuses["eigenvector_centrality"] = {
                    "status": "LIMITED",
                    "reason": "Graph contains insufficient nodes/edges for eigenvector iteration.",
                    "algorithm": "nx.eigenvector_centrality_numpy"
                }
            else:
                eigen_cent = nx.eigenvector_centrality_numpy(G, weight="weight")
                metric_statuses["eigenvector_centrality"] = {
                    "status": "COMPUTED",
                    "reason": "Successfully computed eigenvector centrality via NumPy power iteration.",
                    "algorithm": "nx.eigenvector_centrality_numpy"
                }
        except Exception as e:
            logger.warning(f"Eigenvector centrality calculation fallback notice: {e}")
            try:
                eigen_cent = self._eigenvector_fallback(G, weight="weight")
                metric_statuses["eigenvector_centrality"] = {
                    "status": "COMPUTED_FALLBACK",
                    "reason": "Computed eigenvector centrality using NumPy power iteration fallback.",
                    "algorithm": "_eigenvector_fallback"
                }
            except Exception as ex:
                eigen_cent = {n: 0.0 for n in G.nodes}
                metric_statuses["eigenvector_centrality"] = {
                    "status": "UNAVAILABLE",
                    "reason": f"Graph structure does not support stable eigenvector convergence: {str(ex)}",
                    "algorithm": "nx.eigenvector_centrality_numpy"
                }


        # E. PageRank
        try:
            if N == 0:
                pagerank_scores = {}
                metric_statuses["pagerank"] = {"status": "UNAVAILABLE", "reason": "Graph is empty.", "algorithm": "nx.pagerank"}
            else:
                pagerank_scores = nx.pagerank(G, alpha=settings.PAGERANK_ALPHA, weight="weight")
                metric_statuses["pagerank"] = {
                    "status": "COMPUTED",
                    "reason": "Successfully computed PageRank influence scores.",
                    "algorithm": "nx.pagerank"
                }
        except Exception as e:
            logger.warning(f"PageRank calculation fallback: {e}")
            pagerank_scores = self._pagerank_fallback(G, alpha=settings.PAGERANK_ALPHA, weight="weight")
            metric_statuses["pagerank"] = {
                "status": "COMPUTED_FALLBACK",
                "reason": "Computed using NumPy power iteration fallback.",
                "algorithm": "_pagerank_fallback"
            }

        # F. Clustering Coefficients & Communities
        clustering_coeffs = nx.clustering(G_undirected)
        metric_statuses["clustering_coefficient"] = {
            "status": "COMPUTED",
            "reason": "Computed undirected clustering coefficients.",
            "algorithm": "nx.clustering"
        }

        try:
            if N <= 1:
                communities = {n: 0 for n in G.nodes}
                metric_statuses["community_detection"] = {
                    "status": "LIMITED",
                    "reason": "Graph has <= 1 node; single default community assigned.",
                    "algorithm": "community_louvain"
                }
            else:
                communities = community_louvain.best_partition(G_undirected)
                metric_statuses["community_detection"] = {
                    "status": "COMPUTED",
                    "reason": "Successfully performed Louvain modularity community partition.",
                    "algorithm": "community_louvain.best_partition"
                }
        except Exception as e:
            logger.warning(f"Louvain community detection notice: {e}")
            communities = {n: 0 for n in G.nodes}
            metric_statuses["community_detection"] = {
                "status": "UNAVAILABLE",
                "reason": f"Community partitioning algorithm encountered issue: {str(e)}",
                "algorithm": "community_louvain"
            }

        # 4. Normalize Centrality Metrics across Graph for Explainable Influence Score
        norm_degree = self._normalize_dict(degree_cent)
        norm_betweenness = self._normalize_dict(betweenness_cent)
        norm_pagerank = self._normalize_dict(pagerank_scores)
        norm_eigenvector = self._normalize_dict(eigen_cent)

        # 5. Calculate Explainable Event Influence Score & Update Node Records
        for node_id in G.nodes:
            node = node_db_map.get(node_id)
            if not node:
                continue

            node.degree_centrality = float(degree_cent.get(node_id, 0.0))
            node.betweenness_centrality = float(betweenness_cent.get(node_id, 0.0))
            node.closeness_centrality = float(closeness_cent.get(node_id, 0.0))
            node.eigenvector_centrality = float(eigen_cent.get(node_id, 0.0))
            node.pagerank = float(pagerank_scores.get(node_id, 0.0))
            node.clustering_coefficient = float(clustering_coeffs.get(node_id, 0.0))
            node.community_id = str(communities.get(node_id, 0))

            # Explainable Influence Score Calculation
            # Weights: Network Influence (PageRank) 35%, Bridge Importance (Betweenness) 30%,
            # Direct Connectivity (Degree) 20%, Eigenvector Significance 15%
            inf_score = (
                0.35 * norm_pagerank[node_id] +
                0.30 * norm_betweenness[node_id] +
                0.20 * norm_degree[node_id] +
                0.15 * norm_eigenvector[node_id]
            )
            node.influence_score = round(float(inf_score), 4)

        # 6. Evidence-Based Community Labeling & Analysis
        community_summary = self._analyze_and_label_communities(G, communities, node_db_map)

        # Update nodes with descriptive community labels if available
        for node_id, node in node_db_map.items():
            comm_raw_id = str(communities.get(node_id, 0))
            if comm_raw_id in community_summary:
                node.community_id = community_summary[comm_raw_id]["label"]

        # 7. Bridge Event Detection
        bridge_events = self._detect_bridge_events(G, betweenness_cent, norm_betweenness, communities, community_summary, node_db_map)

        # 8. Graph-Level Statistics
        density = nx.density(G)
        avg_clustering = nx.average_clustering(G_undirected) if N > 0 else 0.0
        connected_comp_count = len(list(nx.weakly_connected_components(G)))

        diameter = None
        avg_shortest_path = None
        if N > 1 and nx.is_weakly_connected(G):
            try:
                diameter = float(nx.diameter(G_undirected))
                avg_shortest_path = float(nx.average_shortest_path_length(G_undirected))
                metric_statuses["graph_diameter"] = {"status": "COMPUTED", "reason": "Graph is connected; diameter computed.", "algorithm": "nx.diameter"}
            except Exception as e:
                metric_statuses["graph_diameter"] = {"status": "UNAVAILABLE", "reason": f"Diameter calculation notice: {str(e)}", "algorithm": "nx.diameter"}
        else:
            metric_statuses["graph_diameter"] = {
                "status": "UNAVAILABLE",
                "reason": "Graph is disconnected or contains <= 1 node; diameter and avg shortest path are undefined.",
                "algorithm": "nx.diameter"
            }

        # 9. Reproducibility & Snapshot Metadata
        snapshot_metadata = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "graph_scope": "Global Event Chain Analysis",
            "node_count": N,
            "edge_count": E,
            "algorithm_version": "V5.1 Graph Intelligence System",
            "configuration_version": "5.1.0",
            "data_freshness_information": {
                "computation_mode": "REAL_EVENT_GRAPH",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }

        # 10. Persist NetworkAnalysisResult in DB
        stmt_res = select(NetworkAnalysisResult).where(NetworkAnalysisResult.chain_id == chain_id)
        res_summary = await self.db.execute(stmt_res)
        summary = res_summary.scalars().first()

        if not summary:
            summary = NetworkAnalysisResult(chain_id=chain_id)
            self.db.add(summary)

        summary.node_count = N
        summary.edge_count = E
        summary.network_density = float(density)
        summary.clustering_coefficient = float(avg_clustering)
        summary.connected_components = int(connected_comp_count)
        summary.graph_diameter = diameter
        summary.avg_shortest_path = avg_shortest_path
        summary.metadata_json = snapshot_metadata
        summary.metric_status_json = metric_statuses
        summary.community_summary_json = community_summary
        summary.bridge_events_json = bridge_events

        await self.db.commit()
        logger.info(f"SNA V5.1: Analysis completed for chain {chain_id}. Nodes: {N}, Edges: {E}, Communities: {len(community_summary)}, Bridge Events: {len(bridge_events)}")
        return summary

    def _normalize_dict(self, d: dict[str, float]) -> dict[str, float]:
        """Normalizes dictionary values to [0.0, 1.0] scale safely."""
        if not d:
            return {}
        vals = list(d.values())
        min_v, max_v = min(vals), max(vals)
        if max_v == min_v:
            return {k: (0.5 if max_v > 0 else 0.0) for k in d}
        return {k: float((v - min_v) / (max_v - min_v)) for k, v in d.items()}

    def _analyze_and_label_communities(
        self,
        G: nx.DiGraph,
        communities: dict[str, int],
        node_db_map: dict[str, EventChainNode]
    ) -> dict[str, dict]:
        """
        Analyzes topological communities by composition (categories, sectors, entities)
        and generates evidence-based descriptive labels.
        """
        community_groups: dict[int, list[EventChainNode]] = {}
        for node_id, comm_id in communities.items():
            db_node = node_db_map.get(node_id)
            if db_node:
                community_groups.setdefault(comm_id, []).append(db_node)

        results: dict[str, dict] = {}

        for comm_id, nodes in community_groups.items():
            total_events = len(nodes)
            category_counts: dict[str, int] = {}
            sector_counts: dict[str, int] = {}
            entity_counts: dict[str, int] = {}
            event_summaries = []

            for n in nodes:
                event = n.event
                if event:
                    cat = (event.category or "ECONOMIC").upper()
                    category_counts[cat] = category_counts.get(cat, 0) + 1

                    if event.sectors and isinstance(event.sectors, list):
                        for sec in event.sectors:
                            sector_counts[sec] = sector_counts.get(sec, 0) + 1
                    
                    if event.organizations and isinstance(event.organizations, list):
                        for org in event.organizations:
                            entity_counts[org] = entity_counts.get(org, 0) + 1

                    event_summaries.append({
                        "node_id": n.id,
                        "event_id": n.event_id,
                        "title": event.title,
                        "category": cat,
                        "influence_score": n.influence_score
                    })

            # Identify dominant category
            sorted_cats = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
            dom_cat, dom_cat_count = sorted_cats[0] if sorted_cats else ("ECONOMIC", 0)
            cat_ratio = dom_cat_count / total_events if total_events > 0 else 0.0

            # Identify dominant sector
            sorted_sectors = sorted(sector_counts.items(), key=lambda x: x[1], reverse=True)
            dom_sector, dom_sector_count = sorted_sectors[0] if sorted_sectors else (None, 0)

            # Generate Evidence-Based Descriptive Label
            # Threshold: >= 40% dominance
            if cat_ratio >= 0.40:
                if dom_sector and (dom_sector_count / total_events) >= 0.25:
                    label = f"{dom_cat.title()} & {dom_sector.title()} Event Community"
                else:
                    label = f"{dom_cat.title()} Event Community"
                confidence = round(cat_ratio, 2)
            else:
                label = f"Unclassified Event Community {comm_id}"
                confidence = round(cat_ratio, 2)

            results[str(comm_id)] = {
                "community_id": str(comm_id),
                "label": label,
                "confidence": confidence,
                "event_count": total_events,
                "dominant_category": dom_cat,
                "category_breakdown": {k: v for k, v in category_counts.items()},
                "dominant_sectors": [k for k, _ in sorted_sectors[:3]],
                "dominant_entities": [k for k, _ in sorted(entity_counts.items(), key=lambda x: x[1], reverse=True)[:3]],
                "events": event_summaries
            }

        return results

    def _detect_bridge_events(
        self,
        G: nx.DiGraph,
        betweenness_raw: dict[str, float],
        betweenness_norm: dict[str, float],
        communities: dict[str, int],
        community_summary: dict[str, dict],
        node_db_map: dict[str, EventChainNode]
    ) -> list[dict]:
        """
        Identifies structural network bridge events based on betweenness centrality
        and inter-community edge connectivity.
        """
        bridge_list = []

        for node_id in G.nodes:
            db_node = node_db_map.get(node_id)
            if not db_node:
                continue

            raw_b = betweenness_raw.get(node_id, 0.0)
            norm_b = betweenness_norm.get(node_id, 0.0)

            # Find neighboring nodes and their communities
            neighbors = list(G.predecessors(node_id)) + list(G.successors(node_id))
            own_comm = str(communities.get(node_id, 0))

            connected_comms = set()
            inter_community_edge_count = 0

            for neighbor in set(neighbors):
                neighbor_comm = str(communities.get(neighbor, 0))
                connected_comms.add(neighbor_comm)
                if neighbor_comm != own_comm:
                    inter_community_edge_count += 1

            # Criterion for Network Bridge Event:
            # Normalized betweenness > 0.15 OR connects 2 or more distinct communities with inter-community edges
            if norm_b >= 0.15 or (len(connected_comms) >= 2 and inter_community_edge_count >= 1):
                comm_labels = [community_summary.get(c, {}).get("label", f"Community {c}") for c in connected_comms]
                role_desc = f"Network bridge event connecting {len(connected_comms)} distinct graph regions ({', '.join(comm_labels[:2])})."

                bridge_list.append({
                    "node_id": node_id,
                    "event_id": db_node.event_id,
                    "event_title": db_node.event.title if db_node.event else "Unknown Event",
                    "bridge_importance": round(raw_b, 4),
                    "normalized_bridge_importance": round(norm_b, 4),
                    "inter_community_edge_count": inter_community_edge_count,
                    "connected_communities": comm_labels,
                    "structural_role_description": role_desc
                })

        # Sort bridge events by bridge importance descending
        bridge_list.sort(key=lambda x: x["normalized_bridge_importance"], reverse=True)
        return bridge_list

    def _pagerank_fallback(self, G: nx.DiGraph, alpha=0.85, max_iter=100, tol=1.0e-6, weight="weight") -> dict:
        """Pure NumPy/Python power iteration PageRank fallback."""
        import numpy as np
        if len(G) == 0:
            return {}
        
        nodes = list(G.nodes)
        node_index = {node: i for i, node in enumerate(nodes)}
        N = len(nodes)
        
        x = np.ones(N) / N
        out_weights = np.zeros(N)
        for u in G.nodes:
            deg = 0.0
            for v in G[u]:
                deg += G[u][v].get(weight, 1.0)
            out_weights[node_index[u]] = deg

        for _ in range(max_iter):
            xlast = x.copy()
            x = np.zeros(N)
            dangling_sum = sum(xlast[i] for i in range(N) if out_weights[i] == 0.0)
            
            for u in G.nodes:
                u_idx = node_index[u]
                if out_weights[u_idx] > 0.0:
                    for v in G[u]:
                        v_idx = node_index[v]
                        w = G[u][v].get(weight, 1.0)
                        x[v_idx] += alpha * xlast[u_idx] * w / out_weights[u_idx]
            
            x += (1.0 - alpha) / N + alpha * dangling_sum / N
            
        return {nodes[i]: float(x[i]) for i in range(N)}

    def _eigenvector_fallback(self, G: nx.DiGraph, max_iter=100, tol=1.0e-6, weight="weight") -> dict:
        """Pure NumPy power iteration Eigenvector Centrality fallback."""
        import numpy as np
        nodes = list(G.nodes)
        N = len(nodes)
        if N == 0:
            return {}
        idx = {n: i for i, n in enumerate(nodes)}
        x = np.ones(N) / np.sqrt(N)
        A = np.zeros((N, N))
        for u, v, d in G.edges(data=True):
            A[idx[u], idx[v]] = d.get(weight, 1.0)
        
        for _ in range(max_iter):
            xlast = x.copy()
            x = A @ xlast
            norm = np.linalg.norm(x)
            if norm == 0:
                return {n: 0.0 for n in nodes}
            x = x / norm
            if np.linalg.norm(x - xlast) < tol:
                break
        return {nodes[i]: float(x[i]) for i in range(N)}


    async def _save_empty_result(self, chain_id: str, reason: str) -> NetworkAnalysisResult:
        """Creates an honest structured result for an empty or insufficient graph."""
        stmt_res = select(NetworkAnalysisResult).where(NetworkAnalysisResult.chain_id == chain_id)
        res_summary = await self.db.execute(stmt_res)
        summary = res_summary.scalars().first()

        if not summary:
            summary = NetworkAnalysisResult(chain_id=chain_id)
            self.db.add(summary)

        empty_metric_status = {
            "degree_centrality": {"status": "UNAVAILABLE", "reason": reason, "algorithm": "nx.degree_centrality"},
            "betweenness_centrality": {"status": "UNAVAILABLE", "reason": reason, "algorithm": "nx.betweenness_centrality"},
            "closeness_centrality": {"status": "UNAVAILABLE", "reason": reason, "algorithm": "nx.closeness_centrality"},
            "eigenvector_centrality": {"status": "UNAVAILABLE", "reason": reason, "algorithm": "nx.eigenvector_centrality_numpy"},
            "pagerank": {"status": "UNAVAILABLE", "reason": reason, "algorithm": "nx.pagerank"},
            "community_detection": {"status": "UNAVAILABLE", "reason": reason, "algorithm": "community_louvain"}
        }

        summary.node_count = 0
        summary.edge_count = 0
        summary.network_density = 0.0
        summary.clustering_coefficient = 0.0
        summary.connected_components = 0
        summary.metadata_json = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "graph_scope": "Empty Graph Analysis",
            "node_count": 0,
            "edge_count": 0,
            "reason": reason
        }
        summary.metric_status_json = empty_metric_status
        summary.community_summary_json = {}
        summary.bridge_events_json = []

        await self.db.commit()
        return summary
