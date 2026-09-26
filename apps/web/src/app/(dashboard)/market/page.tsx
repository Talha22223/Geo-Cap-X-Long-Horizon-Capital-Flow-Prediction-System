'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import {
  Globe, TrendingUp, TrendingDown, ArrowRight, RefreshCw,
  Server, AlertTriangle, CheckCircle2, AlertCircle, Database,
  BarChart2, Brain, Info,
} from 'lucide-react';
import Link from 'next/link';
import { useMarketIntelligence } from '../../../lib/hooks/useMarketIntelligence';

const DEFAULT_SYMBOLS = ['SPY', 'EURUSD=X', 'GLD', 'CL=F', 'QQQ', 'EEM'];

// Three-layer data distinction config
const LAYER_CONFIG = {
  OBSERVED: {
    label: 'OBSERVED DATA',
    description: 'Raw market prices and volumes fetched directly from yfinance provider',
    cls: 'data-layer-observed',
    icon: Database,
  },
  DERIVED: {
    label: 'DERIVED SIGNAL',
    description: 'Statistical Z-score, rolling baseline, abnormality indicators computed from observations',
    cls: 'data-layer-derived',
    icon: BarChart2,
  },
  INTERPRETED: {
    label: 'INTERPRETATION',
    description: 'Capital flow direction inference aligned to geopolitical event windows',
    cls: 'data-layer-interpreted',
    icon: Brain,
  },
};

function DataLayerBadge({ type }: { type: keyof typeof LAYER_CONFIG }) {
  const { label, cls } = LAYER_CONFIG[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

export default function MarketPage() {
  const [activeSymbol, setActiveSymbol] = React.useState('SPY');
  const { observations, signals, sourcesStatus, loading, refetch } = useMarketIntelligence(activeSymbol);

  const latestObs = observations.length > 0 ? observations[observations.length - 1] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Intelligence & Data Sources"
        description="Real market observations, statistical activity signals, and data provider connectivity"
        badge="V6.1 Live Intelligence"
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none transition-colors"
            aria-label="Refresh market data"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* Three-Layer Methodology Explanation */}
      <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/30 shadow-sm dark:shadow-none space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Data Layer Distinction — V6.1 Standard</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(LAYER_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
              <cfg.icon className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <DataLayerBadge type={key as keyof typeof LAYER_CONFIG} />
                <p className="text-[10px] text-slate-600 dark:text-slate-500 mt-1.5 leading-relaxed">{cfg.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provider Status */}
      <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="geocap-section-label">Financial Data Provider Status</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">V6.1 Standard</span>
        </div>
        {!Array.isArray(sourcesStatus) || sourcesStatus.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            No provider status records available. AI service may be offline.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Array.isArray(sourcesStatus) ? sourcesStatus : []).map((src) => (
              <div
                key={src.provider_name}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{src.provider_name}</p>
                  <p className="text-[10px] text-slate-500">{src.category}</p>
                </div>
                {src.status === 'ACTIVE' ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <AlertTriangle className="h-3 w-3" /> {src.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Symbol selector */}
      <div>
        <h3 className="geocap-section-label mb-2">Select Instrument</h3>
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Select market instrument">
          {DEFAULT_SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => setActiveSymbol(sym)}
              aria-pressed={activeSymbol === sym}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm dark:shadow-none transition-all ${
                activeSymbol === sym
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Layer 1: Observed Data */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DataLayerBadge type="OBSERVED" />
          <span className="text-xs text-slate-500">Latest market observation for {activeSymbol}</span>
        </div>

        {loading ? (
          <div className="h-24 rounded-2xl geocap-skeleton" />
        ) : !latestObs ? (
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/30 flex items-center gap-3 shadow-sm dark:shadow-none">
            <Database className="h-4 w-4 text-slate-400 dark:text-slate-600" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">No market observations available for {activeSymbol}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                yfinance provider returned no data for this symbol. This may be a rate limit, network, or symbol validity issue.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Close Price', value: latestObs.close_price != null ? `$${latestObs.close_price.toFixed(2)}` : 'N/A', sub: 'Raw observed' },
              { label: 'Volume', value: latestObs.volume != null ? latestObs.volume.toLocaleString() : 'N/A', sub: 'Raw observed' },
              { label: 'Return', value: (latestObs as any).daily_return != null ? `${((latestObs as any).daily_return * 100).toFixed(3)}%` : 'N/A', sub: 'Daily price Δ' },
              { label: 'Provider', value: latestObs.source || 'yfinance', sub: latestObs.timestamp?.slice(0, 10) || '—' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/30 shadow-sm dark:shadow-none">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5 tabular-nums">{value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Layer 2: Derived Signals */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DataLayerBadge type="DERIVED" />
          <span className="text-xs text-slate-500">Statistical signals derived from observations for {activeSymbol}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array(4).fill(null).map((_, i) => <div key={i} className="h-24 geocap-skeleton" />)}
          </div>
        ) : signals.length === 0 ? (
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/30 flex items-center gap-3 shadow-sm dark:shadow-none">
            <BarChart2 className="h-4 w-4 text-slate-400 dark:text-slate-600" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">No derived signals for {activeSymbol}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Insufficient historical observation data to compute baseline statistics and Z-score abnormality measures.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {signals.map((sig, i) => (
              <motion.div
                key={sig.indicator_name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                    {sig.category}
                  </span>
                  {sig.z_score !== null && sig.z_score >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{sig.indicator_name}</p>
                <p className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">{sig.value}</p>
                {sig.z_score !== null && (
                  <p className={`text-xs font-semibold mt-1 ${sig.z_score >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    Z-Score: {sig.z_score > 0 ? '+' : ''}{sig.z_score}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2 truncate" title={sig.formula}>
                  {sig.formula}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Layer 3: Interpretation CTA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DataLayerBadge type="INTERPRETED" />
          <span className="text-xs text-slate-500">Capital flow direction inference from signal alignment</span>
        </div>

        <div className="p-5 rounded-2xl border border-indigo-200/80 dark:border-violet-500/20 bg-indigo-50/40 dark:bg-violet-500/5 shadow-sm dark:shadow-none flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-indigo-600 dark:text-violet-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Capital Flow & Event-Aligned Signal Analysis</p>
              <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">
                View event-to-asset mappings, pre/post baselines, and estimated rotation signals
              </p>
            </div>
          </div>
          <Link
            href="/flows"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all"
          >
            View Flow Intelligence <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
