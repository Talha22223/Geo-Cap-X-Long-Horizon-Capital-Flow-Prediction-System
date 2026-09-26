'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Filter, Info, ShieldCheck, AlertCircle, RefreshCw,
} from 'lucide-react';
import { usePredictions } from '../../../lib/hooks/usePredictions';

export default function FlowsPage() {
  const [activeDirection, setActiveDirection] = React.useState<'All' | 'INFLOW' | 'OUTFLOW'>('All');
  const { predictions, loading, error, refetch } = usePredictions();

  const filtered = useMemo(() => {
    if (activeDirection === 'All') return predictions;
    return predictions.filter(p => p.direction === activeDirection || p.direction === activeDirection);
  }, [predictions, activeDirection]);

  const totalInflows = useMemo(
    () => predictions.filter(p => p.direction === 'INFLOW').reduce((s, p) => s + (p.estimated_rotation_usd_bn ?? 0), 0),
    [predictions]
  );
  const totalOutflows = useMemo(
    () => predictions.filter(p => p.direction === 'OUTFLOW').reduce((s, p) => s + (p.estimated_rotation_usd_bn ?? 0), 0),
    [predictions]
  );
  const netFlow = totalInflows - totalOutflows;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capital Flow & Market Activity Intelligence"
        description="Market proxy signals, event-aligned activity, and estimated cross-border rotation"
        badge="V6.1 Real Intelligence"
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* Methodology Disambiguation */}
      <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/5 shadow-sm dark:shadow-none flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">V6.1 Methodology: Market Proxies vs Direct Flow Data</p>
          <p className="text-slate-600 dark:text-slate-400">
            GEOCAP-X distinguishes{' '}
            <span className="text-blue-700 dark:text-blue-300 font-semibold">OBSERVED DATA</span> (raw price/volume from yfinance){' '}
            from{' '}
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold">DERIVED SIGNAL</span> (Z-score abnormality, rolling metrics){' '}
            from{' '}
            <span className="text-violet-700 dark:text-violet-300 font-semibold">INTERPRETATION</span> (capital flow direction inference).
            Signals indicate temporal anomaly alignment around events. Causality is not asserted.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array(3).fill(null).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl geocap-skeleton" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Capital flow predictions unavailable</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Ensure the AI service is running and events have been processed through the ingestion pipeline.
            </p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && predictions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20">
          <div className="geocap-empty-state">
            <TrendingUp className="geocap-empty-state-icon" />
            <p className="geocap-empty-title">No capital flow predictions available</p>
            <p className="geocap-empty-body">
              Run the ingestion pipeline to extract events, then trigger the Capital Flow Engine
              from the AI Forecasts page to generate market-aligned predictions.
            </p>
          </div>
        </div>
      )}

      {/* Data available */}
      {!loading && !error && predictions.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Total Observed Inflows',
                value: `$${totalInflows.toFixed(1)}B`,
                icon: ArrowUpRight,
                color: 'text-emerald-500 dark:text-emerald-400',
                bg: 'bg-emerald-500/10',
                note: 'MARKET_PROXY_DATA',
              },
              {
                label: 'Total Observed Outflows',
                value: `$${totalOutflows.toFixed(1)}B`,
                icon: ArrowDownLeft,
                color: 'text-rose-500 dark:text-rose-400',
                bg: 'bg-rose-500/10',
                note: 'MARKET_PROXY_DATA',
              },
              {
                label: 'Net Observed Rotation',
                value: `${netFlow >= 0 ? '' : '-'}$${Math.abs(netFlow).toFixed(1)}B`,
                icon: netFlow >= 0 ? TrendingUp : TrendingDown,
                color: netFlow >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400',
                bg: netFlow >= 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
                note: 'ESTIMATED_ROTATION',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{item.value}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">{item.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Direction filter */}
          <div className="flex items-center gap-3">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <div className="flex gap-2" role="group" aria-label="Filter by direction">
              {(['All', 'INFLOW', 'OUTFLOW'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDirection(d)}
                  aria-pressed={activeDirection === d}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm dark:shadow-none transition-all ${
                    activeDirection === d
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                  }`}
                >
                  {d === 'All' ? 'All Directions' : d}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive table */}
          <div className="geocap-table-wrapper">
            <table className="geocap-table">
              <thead>
                <tr>
                  <th>Asset / Region</th>
                  <th>Direction</th>
                  <th>Est. Rotation</th>
                  <th>Data Category</th>
                  <th>Evidence & Attribution</th>
                  <th className="text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((flow, i) => {
                  const isInflow = flow.direction === 'INFLOW';
                  const conf = Math.round((flow.overall_confidence ?? 0) * 100);

                  return (
                    <motion.tr
                      key={flow.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {flow.affected_country || flow.affected_region || 'Global Asset'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {flow.asset_class || flow.affected_sector || '—'}
                        </p>
                      </td>
                      <td>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isInflow ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                          {flow.direction}
                        </span>
                      </td>
                      <td className="font-mono text-slate-800 dark:text-slate-300 font-semibold">
                        {flow.estimated_rotation_usd_bn > 0
                          ? `$${flow.estimated_rotation_usd_bn.toFixed(1)}B`
                          : '—'}
                      </td>
                      <td>
                        <span className="text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-500/20 whitespace-nowrap">
                          MARKET_PROXY_DATA
                        </span>
                      </td>
                      <td>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xs">
                          {flow.affected_sector
                            ? `${flow.affected_sector} sector signal`
                            : 'No attribution available'}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 tabular-nums">{conf}%</span>
                          <div className="w-14 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${conf}%` }} />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Data provenance note */}
          <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500/40" />
            All rotation estimates are derived from real CapitalFlowPrediction records in the database.
            No hardcoded values. Methodology: V6.1.
          </div>
        </>
      )}
    </div>
  );
}
