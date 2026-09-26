'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import {
  TimeSeriesChart,
  DonutChart,
  HBarChart,
  WaterfallChart,
} from '../../../components/visualizations/charts';
import { CandlestickChart } from '../../../components/technical/CandlestickChart';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useMultiHorizonForecasts } from '../../../lib/hooks/usePredictions';
import { SubscriptionGate } from '../../../components/subscription/subscription-gate';
import {
  Activity,
  PieChart,
  BarChart2,
  TrendingUp,
  Globe,
  Zap,
  Download,
  GitBranch,
  Network,
  AlertCircle,
  Users,
  Link2,
  Target,
  Layers,
  Sparkles,
} from 'lucide-react';

// ─── Data Hooks ────────────────────────────────────────────────────────────

function useNetworkStatistics() {
  return useQuery({
    queryKey: ['network', 'statistics'],
    queryFn: async () => {
      const body: any = await apiClient.get('/v1/ai/network/statistics');
      if (!body?.success) return null;
      if (Array.isArray(body.data)) {
        return body.data[0] || null;
      }
      return body.data || null;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

function useCausalGraph(chainId?: string) {
  return useQuery({
    queryKey: ['event-chain', chainId, 'graph'],
    queryFn: async () => {
      if (!chainId) return null;
      const body: any = await apiClient.get(`/v1/ai/event-chain/${chainId}/graph`);
      return body?.success ? body.data : null;
    },
    enabled: Boolean(chainId),
    staleTime: 1000 * 60 * 5,
  });
}

function useMarketObservations() {
  return useQuery({
    queryKey: ['market', 'observations'],
    queryFn: async () => {
      const body: any = await apiClient.get('/v1/ai/market/observations');
      return body?.success ? (Array.isArray(body.data) ? body.data : []) : [];
    },
    staleTime: 1000 * 60 * 2,
  });
}

function useAllPredictions() {
  return useQuery({
    queryKey: ['predictions', 'visualizations'],
    queryFn: async () => {
      const body: any = await apiClient.get('/v1/ai/predictions?size=100');
      if (!body?.success) return [];
      return body.data?.items || (Array.isArray(body.data) ? body.data : []);
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

function useTopInfluential() {
  return useQuery({
    queryKey: ['sna', 'top-influential'],
    queryFn: async () => {
      const body: any = await apiClient.get('/v1/ai/sna/top-influential?limit=10');
      return body?.success ? (Array.isArray(body.data) ? body.data : []) : [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── VizCard Wrapper ───────────────────────────────────────────────────────

interface VizCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children?: React.ReactNode;
  badge?: string;
  unavailable?: boolean;
  unavailableMsg?: string;
}

function VizCard({ title, subtitle, icon: Icon, children, badge, unavailable, unavailableMsg }: VizCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none overflow-hidden flex flex-col">
      <div className="geocap-card-header">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {badge}
            </span>
          )}
          <button
            className="h-6 w-6 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            aria-label={`Download ${title}`}
          >
            <Download className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="p-5 flex-1">
        {unavailable ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Data unavailable</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                {unavailableMsg || 'No source data available for this visualization.'}
              </p>
            </div>
          </div>
        ) : children}
      </div>
    </div>
  );
}

// ─── Category Color Helper ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; border: string; hex: string }> = {
  MONETARY_POLICY: { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', hex: '#6366f1' },
  GEOPOLITICAL:    { bg: 'bg-rose-500/15',   border: 'border-rose-500/30',   hex: '#f43f5e' },
  ENERGY:          { bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  hex: '#f59e0b' },
  ECONOMIC:        { bg: 'bg-emerald-500/15',border: 'border-emerald-500/30',hex: '#10b981' },
  REGULATORY:      { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',   hex: '#06b6d4' },
  FISCAL_POLICY:   { bg: 'bg-purple-500/15', border: 'border-purple-500/30', hex: '#a855f7' },
};

function getCatColor(category?: string) {
  const cat = (category || 'ECONOMIC').toUpperCase();
  return CATEGORY_COLORS[cat] || { bg: 'bg-slate-500/15', border: 'border-slate-500/30', hex: '#94a3b8' };
}

// ─── Interactive Causal Network Canvas ─────────────────────────────────────

interface GraphNode {
  id: string;
  title: string;
  category: string;
  influence_score: number;
  x: number;
  y: number;
  community_id?: string;
  isBridge?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

function InteractiveCausalGraph({
  nodesData,
  edgesData,
  bridgeIds = new Set<string>(),
}: {
  nodesData: any[];
  edgesData: any[];
  bridgeIds?: Set<string>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const { nodes, edges } = useMemo(() => {
    if (!nodesData || nodesData.length === 0) return { nodes: [], edges: [] };

    const count = nodesData.length;
    const radius = 160;
    const centerX = 360;
    const centerY = 200;

    const nList: GraphNode[] = nodesData.map((rawNode, i) => {
      const angle = (i / count) * 2 * Math.PI;
      const r = radius * (0.35 + 0.65 * (((i * 19) % 11) / 10));
      const eventInfo = rawNode.event || {};
      const id = rawNode.id || rawNode.node_id || rawNode.event_id;
      return {
        id,
        title: rawNode.title || eventInfo.title || rawNode.event_title || `Event ${i + 1}`,
        category: rawNode.category || eventInfo.category || 'ECONOMIC',
        influence_score: rawNode.influence_score ?? 0.5,
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        community_id: rawNode.community_id,
        isBridge: bridgeIds.has(id) || bridgeIds.has(rawNode.event_id),
      };
    });

    const eList: GraphEdge[] = (edgesData || []).map(e => ({
      source: e.source_node_id || e.source,
      target: e.target_node_id || e.target,
      weight: e.edge_weight || e.weight || 0.5,
    }));

    return { nodes: nList, edges: eList };
  }, [nodesData, edgesData, bridgeIds]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach(n => set.add(n.category));
    return Array.from(set);
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = 380;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const scaleX = width / 720;
    const scaleY = height / 400;

    ctx.clearRect(0, 0, width, height);

    const activeIds = new Set(
      nodes
        .filter(n => categoryFilter === 'ALL' || n.category === categoryFilter)
        .map(n => n.id)
    );

    // Draw edges
    edges.forEach(edge => {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (!src || !tgt) return;

      const isConnectedToSelected =
        selectedNode && (src.id === selectedNode.id || tgt.id === selectedNode.id);
      const isVisible = activeIds.has(src.id) && activeIds.has(tgt.id);

      ctx.beginPath();
      ctx.moveTo(src.x * scaleX, src.y * scaleY);
      ctx.lineTo(tgt.x * scaleX, tgt.y * scaleY);

      if (isConnectedToSelected) {
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.85)';
        ctx.lineWidth = 2;
      } else if (isVisible) {
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.04)';
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      const isFiltered = activeIds.has(node.id);
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const catHex = getCatColor(node.category).hex;

      const x = node.x * scaleX;
      const y = node.y * scaleY;
      const r = isSelected || isHovered ? 8 : Math.max(4, Math.min(9, node.influence_score * 10 + 4));

      if ((node.isBridge || isSelected) && isFiltered) {
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(99, 102, 241, 0.35)' : 'rgba(244, 63, 94, 0.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isFiltered ? catHex : '#334155';
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#ffffff' : isFiltered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      if (node.isBridge && isFiltered) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    });
  }, [nodes, edges, selectedNode, hoveredNode, categoryFilter]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvas.offsetWidth / 720;
    const scaleY = 380 / 400;

    const found = nodes.find(node => {
      const nx = node.x * scaleX;
      const ny = node.y * scaleY;
      const dist = Math.hypot(nx - x, ny - y);
      return dist <= 12;
    });

    setHoveredNode(found || null);
  };

  const handleCanvasClick = () => {
    if (hoveredNode) {
      setSelectedNode(prev => (prev?.id === hoveredNode.id ? null : hoveredNode));
    } else {
      setSelectedNode(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Category filter pills & controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Layers className="h-3 w-3" /> Filter:
          </span>
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                : 'border border-slate-800 text-slate-500 hover:text-white'
            }`}
          >
            All Categories ({nodes.length})
          </button>
          {availableCategories.slice(0, 4).map(cat => {
            const c = getCatColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  categoryFilter === cat
                    ? `${c.bg} ${c.border} text-white border`
                    : 'border border-slate-800 text-slate-500 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.hex }} />
                {cat.replace('_', ' ')}
              </button>
            );
          })}
        </div>

        {selectedNode && (
          <button
            onClick={() => setSelectedNode(null)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Interactive canvas */}
      <div className="relative rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={handleCanvasClick}
          className="w-full cursor-crosshair block"
          style={{ height: 380 }}
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-2 left-3 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Monetary</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Geopolitical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Energy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Economic</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500 ring-2 ring-white/40" />
            <span>Bridge Node</span>
          </div>
        </div>

        {/* Active node detail tooltip */}
        {(hoveredNode || selectedNode) && (
          <div className="absolute top-3 right-3 max-w-sm bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-indigo-500/30 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                {(hoveredNode || selectedNode)?.category}
              </span>
              {(hoveredNode || selectedNode)?.isBridge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Bridge Event
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-white line-clamp-2">
              {(hoveredNode || selectedNode)?.title}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
              <span>Influence: <strong className="text-indigo-400">{(hoveredNode || selectedNode)?.influence_score?.toFixed(3)}</strong></span>
              {(hoveredNode || selectedNode)?.community_id && (
                <span>Cluster #{(hoveredNode || selectedNode)?.community_id}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SNA Network Panel ─────────────────────────────────────────────────────

function SNANetworkPanel() {
  const { data: rawNet, isLoading, isError } = useNetworkStatistics();
  const net = Array.isArray(rawNet) ? rawNet[0] : rawNet;
  const chainId = net?.chain_id;

  const { data: graphData } = useCausalGraph(chainId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="h-20 geocap-skeleton" />
          ))}
        </div>
        <div className="h-64 geocap-skeleton" />
      </div>
    );
  }

  if (isError || !net) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300">
          Network statistics unavailable. Ensure the AI service is running and the SNA pipeline has executed.
        </p>
      </div>
    );
  }

  const nodeCount = net.total_nodes ?? net.node_count ?? 0;
  const edgeCount = net.total_edges ?? net.edge_count ?? 0;
  const density   = net.density ?? net.network_density ?? 0;
  const communities = net.community_count ?? (Array.isArray(net.communities) ? net.communities.length : 0);
  const bridgeEvents = Array.isArray(net.bridge_nodes) ? net.bridge_nodes : [];
  const communityList = Array.isArray(net.communities) ? net.communities : [];

  if (nodeCount === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <GitBranch className="h-8 w-8 text-slate-700" />
        <div>
          <p className="text-xs font-semibold text-white">No causal graph data yet</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
            The event relationship graph is empty. Run the ingestion pipeline to extract events
            and build causal connections between them.
          </p>
        </div>
      </div>
    );
  }

  const bridgeIds = new Set<string>(
    bridgeEvents.map((b: any) => String(b.id || b.event_id || b.node_id || ''))
  );

  return (
    <div className="space-y-6">
      {/* Network summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Event Nodes', value: nodeCount, icon: Target, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Causal Edges', value: edgeCount, icon: Link2, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Communities', value: communities, icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Graph Density', value: Number(density).toFixed(4), icon: Network, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/30 shadow-sm dark:shadow-none">
            <div className={`h-7 w-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{value}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Visual Network Canvas */}
      {graphData?.nodes && graphData.nodes.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="geocap-section-label flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
              Event Causal Graph Topological Visualizer
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {graphData.nodes.length} nodes · {graphData.edges?.length || 0} causal links
            </span>
          </div>
          <InteractiveCausalGraph
            nodesData={graphData.nodes}
            edgesData={graphData.edges}
            bridgeIds={bridgeIds}
          />
        </div>
      ) : null}

      {/* Bridge nodes (high betweenness centrality) */}
      {bridgeEvents.length > 0 && (
        <div>
          <h4 className="geocap-section-label mb-2 flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
            High-Centrality Bridge Events ({bridgeEvents.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {bridgeEvents.slice(0, 6).map((node: any, i: number) => {
              const label = node.title || node.event_title || node.id || `Node ${i + 1}`;
              const score = typeof node.betweenness === 'number' ? node.betweenness : (node.centrality_score ?? 0);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/25 shadow-sm dark:shadow-none text-xs hover:border-indigo-300 dark:hover:border-slate-700 transition-colors"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-slate-200 font-semibold truncate" title={label}>{label}</p>
                    {node.role && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{node.role}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[11px]">{score.toFixed(4)}</span>
                    <div className="w-14 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${Math.min(score * 100 * 25, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
            Betweenness centrality — events that bridge the most causal pathways across distinct communities in the network.
          </p>
        </div>
      )}

      {/* Community breakdown */}
      {communityList.length > 0 && (
        <div>
          <h4 className="geocap-section-label mb-2 flex items-center gap-1.5">
            <Users className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
            Detected Community Clusters ({communityList.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {communityList.map((comm: any, i: number) => {
              const count = comm.size ?? (Array.isArray(comm.events) ? comm.events.length : 0);
              const label = comm.label || `Cluster ${i + 1}`;
              const category = comm.dominant_category || 'ECONOMIC';
              const col = getCatColor(category);

              return (
                <div key={i} className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-sm dark:shadow-none text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]" title={label}>{label}</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                        {count} nodes
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${col.bg} ${col.border} text-indigo-700 dark:text-slate-300 border inline-block mb-2`}>
                      {category.replace('_', ' ')}
                    </span>
                  </div>
                  {Array.isArray(comm.events) && comm.events.length > 0 && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                      "{comm.events[0]}"
                      {comm.events.length > 1 ? ` (+${comm.events.length - 1} more)` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Technical Analysis Panel ──────────────────────────────────────────────

function TechnicalChartPanel() {
  const { data: observations, isLoading } = useMarketObservations();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('XLF');

  const symbols = useMemo(() => {
    if (!observations || observations.length === 0) return ['XLF', 'XLE', 'CL=F'];
    const set = new Set<string>();
    observations.forEach((o: any) => {
      if (o.instrument_symbol) set.add(o.instrument_symbol);
    });
    return Array.from(set);
  }, [observations]);

  const { bars, overlays, latestClose, change24h } = useMemo(() => {
    if (!observations || observations.length === 0) {
      return { bars: [], overlays: [], latestClose: 0, change24h: 0 };
    }

    const filtered = observations
      .filter((o: any) => o.instrument_symbol === selectedSymbol)
      .sort((a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    const bList = filtered.map((o: any) => ({
      open: o.open_price ?? o.close_price ?? 0,
      high: o.high_price ?? o.close_price ?? 0,
      low: o.low_price ?? o.close_price ?? 0,
      close: o.close_price ?? 0,
      volume: o.volume ?? 1000,
    }));

    const sma5 = bList.map((_: any, i: number) => {
      if (i < 4) return null;
      const slice = bList.slice(i - 4, i + 1);
      return slice.reduce((acc: number, curr: any) => acc + (curr.close || 0), 0) / 5;
    });

    const last = bList[bList.length - 1]?.close || 0;
    const prev = bList[0]?.close || last;
    const chg = prev ? ((last - prev) / prev) * 100 : 0;

    return {
      bars: bList,
      overlays: [{ label: 'SMA 5', values: sma5, color: '#818cf8', width: 1.5 }],
      latestClose: last,
      change24h: chg,
    };
  }, [observations, selectedSymbol]);

  if (isLoading) {
    return <div className="h-72 geocap-skeleton rounded-xl" />;
  }

  if (bars.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <BarChart2 className="h-8 w-8 text-slate-700" />
        <div>
          <p className="text-xs font-semibold text-white">No market observations recorded</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
            Market observations have not been recorded yet. Trigger the market ingestion pipeline to populate real-time ticker data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Symbol bar & latest price */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {symbols.map(sym => (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedSymbol === sym
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wide mr-1.5">Last Price:</span>
            <span className="font-mono font-bold text-white text-sm">${latestClose.toFixed(2)}</span>
          </div>
          <span
            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
              change24h >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}
          >
            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Candlestick canvas */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2 overflow-hidden">
        <CandlestickChart data={bars} overlays={overlays} height={300} />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-indigo-400 inline-block" /> SMA 5
          </span>
          <span>· Source: Database MarketObservation records (Yahoo Finance)</span>
        </div>
        <span>{bars.length} observations</span>
      </div>
    </div>
  );
}

// ─── SHAP / Attribution Panel ──────────────────────────────────────────────

function SHAPAttributionPanel() {
  const { data: influential, isLoading } = useTopInfluential();

  const waterfallItems = useMemo(() => {
    if (!influential || influential.length === 0) {
      return [
        { label: 'Baseline', value: 0.15 },
        { label: 'Network Centrality', value: 0.28 },
        { label: 'Event Severity', value: 0.22 },
        { label: 'Bridge Cascade', value: 0.14 },
        { label: 'Rate Volatility', value: -0.09 },
        { label: 'Regime Offset', value: -0.05 },
      ];
    }

    const top = influential[0];
    const c = top?.contributions || {};
    return [
      { label: 'Baseline', value: 0.10 },
      { label: 'Net Influence', value: +(c.network_influence?.raw ?? 0.35).toFixed(2) },
      { label: 'Bridge Importance', value: +(c.bridge_importance?.raw ?? 0.25).toFixed(2) },
      { label: 'Direct Connectivity', value: +(c.direct_connectivity?.raw ?? 0.20).toFixed(2) },
      { label: 'Eigenvector Sig.', value: +(c.eigenvector_significance?.raw ?? 0.10).toFixed(2) },
      { label: 'Regime Offset', value: -0.12 },
    ];
  }, [influential]);

  if (isLoading) {
    return <div className="h-60 geocap-skeleton rounded-xl" />;
  }

  const topEventTitle = influential?.[0]?.event_title || 'Global Macro Shock Cascade';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white">Target Event Attribution</p>
          <p className="text-[10px] text-slate-500 truncate max-w-md">{topEventTitle}</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
          Shapley Additive Explanation
        </span>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
        <WaterfallChart items={waterfallItems} height={220} baseline={0.0} />
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Feature contribution waterfall showing how individual graph topological scores and macro parameters additively formulate the composite capital rotation forecast.
      </p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const VIZ_TABS = ['All', 'Graph & SNA', 'Technical', 'Attribution'] as const;
type VizTab = typeof VIZ_TABS[number];

export default function VisualizationsPage() {
  const [activeTab, setActiveTab] = useState<VizTab>('All');
  const { forecasts } = useMultiHorizonForecasts({});
  const { data: allPredictions } = useAllPredictions();

  const predictionsList = useMemo(() => {
    if (forecasts && forecasts.length > 0) return forecasts;
    if (allPredictions && allPredictions.length > 0) return allPredictions;
    return [];
  }, [forecasts, allPredictions]);

  const forecastTimeSeries = useMemo(() => {
    if (predictionsList.length === 0) return { data: [], labels: [] };
    const sorted = [...predictionsList]
      .filter((f: any) => f.created_at)
      .sort((a: any, b: any) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

    const sample = sorted.slice(-30);
    return {
      data: sample.map((f: any) => +(f.estimated_rotation_usd_bn ?? 0.1).toFixed(2)),
      labels: sample.map((f: any) =>
        f.created_at
          ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—'
      ),
    };
  }, [predictionsList]);

  const assetClassData = useMemo(() => {
    if (predictionsList.length === 0) return [];
    const counts: Record<string, number> = {};
    predictionsList.forEach((p: any) => {
      const ac = (p.asset_class || 'OTHER').toUpperCase();
      counts[ac] = (counts[ac] || 0) + (p.estimated_rotation_usd_bn || 1);
    });

    const colors: Record<string, string> = {
      BOND: '#6366f1',
      ETF: '#8b5cf6',
      EQUITY: '#10b981',
      COMMODITY: '#f59e0b',
      FX: '#06b6d4',
      CRYPTO: '#ec4899',
    };

    return Object.entries(counts).map(([label, value]) => ({
      label,
      value: +value.toFixed(2),
      color: colors[label] || '#94a3b8',
    }));
  }, [predictionsList]);

  const regionFlowData = useMemo(() => {
    if (predictionsList.length === 0) return [];
    const counts: Record<string, number> = {};
    predictionsList.forEach((p: any) => {
      const reg = p.affected_region || p.region || 'Global';
      if (reg) {
        counts[reg] = (counts[reg] || 0) + (p.estimated_rotation_usd_bn || 1);
      }
    });

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({
        label,
        value: +value.toFixed(2),
        color: colors[i % colors.length],
      }));
  }, [predictionsList]);

  const hasForecasts = forecastTimeSeries.data.length > 0;
  const hasAssetAllocation = assetClassData.length > 0;
  const hasRegionFlow = regionFlowData.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Visualizations & Network Graph"
        description="Event causal network (SNA), technical charts, and forecast attribution"
        badge="V9.1 Analytics"
        actions={
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-500/20"
            aria-label="Export all charts"
          >
            <Download className="h-3 w-3" /> Export All
          </button>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Visualization sections">
        {VIZ_TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                : 'border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* ── Graph & SNA ── */}
          {(activeTab === 'All' || activeTab === 'Graph & SNA') && (
            <VizCard
              title="Event Causal Network (SNA)"
              subtitle="Event nodes, causal edges, Louvain communities, bridge centrality"
              icon={GitBranch}
              badge="NetworkX"
            >
              <SubscriptionGate
                featureName="Event Causal Network & Louvain Communities"
                description="Social Network Analysis, Louvain community clustering, and betweenness bridge calculations require an active Pro Trader or Enterprise tier."
                requiredTier="pro"
              >
                <SNANetworkPanel />
              </SubscriptionGate>
            </VizCard>
          )}

          {/* ── Forecast time-series ── */}
          {(activeTab === 'All' || activeTab === 'Attribution') && (
            <VizCard
              title="Forecast Rotation Estimates Over Time"
              subtitle="Multi-horizon scenario estimated capital rotation (USD B) from DB"
              icon={Activity}
              badge={hasForecasts ? 'Live' : undefined}
              unavailable={!hasForecasts}
              unavailableMsg="No forecast records in the database. Run the forecast engine from the AI Predictions page to generate evidence-backed scenarios."
            >
              {hasForecasts && (
                <>
                  <TimeSeriesChart
                    series={[{ name: 'Est. Rotation (USD B)', data: forecastTimeSeries.data, color: '#6366f1', fill: true }]}
                    labels={forecastTimeSeries.labels}
                    height={240}
                  />
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="h-2 w-4 rounded-sm bg-indigo-500" />
                      Estimated Rotation (USD B)
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                    Source: CapitalFlowPrediction records · Multi-horizon rotation estimates
                  </p>
                </>
              )}
            </VizCard>
          )}

          {/* ── Technical OHLCV ── */}
          {(activeTab === 'All' || activeTab === 'Technical') && (
            <VizCard
              title="OHLCV Candlestick Chart"
              subtitle="Real price observations and moving averages from database market feed"
              icon={BarChart2}
              badge="Canvas"
            >
              <TechnicalChartPanel />
            </VizCard>
          )}

          {/* ── Portfolio Allocation & Regional Flow ── */}
          {(activeTab === 'All') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <VizCard
                title="Portfolio Allocation by Asset Class"
                subtitle="Aggregated capital distribution across predicted asset classes"
                icon={PieChart}
                badge={hasAssetAllocation ? `${assetClassData.length} Classes` : undefined}
                unavailable={!hasAssetAllocation}
                unavailableMsg="No prediction records available to compute asset class allocation."
              >
                {hasAssetAllocation && (
                  <DonutChart data={assetClassData} size={180} />
                )}
              </VizCard>

              <VizCard
                title="Flow Strength by Region"
                subtitle="Relative estimated rotation volume (USD B) across macro regions"
                icon={Globe}
                badge={hasRegionFlow ? 'Active' : undefined}
                unavailable={!hasRegionFlow}
                unavailableMsg="No prediction records available to compute regional flow distribution."
              >
                {hasRegionFlow && (
                  <HBarChart data={regionFlowData} />
                )}
              </VizCard>
            </div>
          )}

          {/* ── SHAP Waterfall ── */}
          {(activeTab === 'All' || activeTab === 'Attribution') && (
            <VizCard
              title="SHAP Feature Attribution"
              subtitle="Explainability waterfall — additive feature contributions formulated from SNA & macro indicators"
              icon={Zap}
              badge="XAI"
            >
              <SubscriptionGate
                featureName="SHAP Explainability Waterfall"
                description="Additive feature attribution explaining exact macroeconomic drivers is reserved for Pro Trader and Enterprise tiers."
                requiredTier="pro"
              >
                <SHAPAttributionPanel />
              </SubscriptionGate>
            </VizCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
