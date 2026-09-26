'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import { CandlestickChart } from '../../../components/technical/CandlestickChart';
import { IndicatorPanel } from '../../../components/technical/IndicatorPanel';
import { MarketStructurePanel } from '../../../components/technical/MarketStructurePanel';
import { ExplainabilityPanel } from '../../../components/technical/ExplainabilityPanel';
import { MTFAlignmentPanel } from '../../../components/technical/MTFAlignmentPanel';
import { PatternsPanel } from '../../../components/technical/PatternsPanel';
import { MOCK_SYMBOLS } from '../../../lib/mockTechnicalData';
import { useTechnicalAnalysis } from '../../../lib/hooks/useTechnicalAnalysis';
import {
  RefreshCw,
  BarChart2,
  Activity,
  Layers,
  Target,
  Brain,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ─── Timeframe / Indicator selectors ─────────────────────────────────────────
const TIMEFRAMES = ['1H', '4H', '1D', '1W', '1M'];

const INDICATOR_GROUPS = {
  Trend: ['SMA 20', 'SMA 50', 'EMA 9', 'Bollinger Bands'],
  Momentum: ['RSI', 'MACD', 'Stochastic RSI'],
  Volume: ['VWAP', 'OBV', 'Volume Profile'],
  Volatility: ['ATR', 'ADX', 'Ichimoku'],
};

const ACTIVE_INDICATORS_DEFAULT = ['SMA 20', 'SMA 50', 'Bollinger Bands'];

// ─── Helper components ────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-6 w-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{children}</h2>
    </div>
  );
}

function StatBadge({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number;
}) {
  const isPos = change !== undefined && change >= 0;
  const isNeg = change !== undefined && change < 0;
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800/60 shadow-sm dark:shadow-none">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
      {change !== undefined && (
         <p className={`text-[10px] font-bold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : isNeg ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
          {isPos ? '+' : ''}{change.toFixed(4)}%
        </p>
      )}
    </div>
  );
}

// ─── Sub-chart selector button ────────────────────────────────────────────────
type SubChartType = 'rsi' | 'macd' | 'adx' | 'volume';

function SubChartTab({ id, label, active, onClick }: { id: SubChartType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm dark:shadow-none transition-all ${
        active
          ? 'bg-indigo-600 text-white'
          : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TechnicalPage() {
  const [symbol, setSymbol] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState('1H');
  const [activeIndicators, setActiveIndicators] = useState<string[]>(ACTIVE_INDICATORS_DEFAULT);
  const [subChart, setSubChart] = useState<SubChartType>('rsi');
  const [showIndicatorDropdown, setShowIndicatorDropdown] = useState(false);

  // Hook for real API
  const { report, explanation: apiExplanation, loading: apiLoading, error: apiError, refetch } = useTechnicalAnalysis(symbol);

  const bars = useMemo(() => {
    return report?.timeframe_reports?.[timeframe]?.ohlcv ?? [];
  }, [report, timeframe]);

  const indicators = useMemo(() => {
    return report?.timeframe_reports?.[timeframe]?.indicators ?? {
      sma_20: [], sma_50: [], ema_9: [], rsi_14: [],
      macd: { line: [], signal: [], histogram: [] },
      bollinger_bands: { upper: [], middle: [], lower: [] }
    };
  }, [report, timeframe]);

  const lastClose = bars.at(-1)?.close ?? 0;
  const prevClose = bars.at(-2)?.close ?? lastClose;
  const pctChange = ((lastClose - prevClose) / prevClose) * 100;
  const isUp = pctChange >= 0;

  // Indicator overlays for candlestick chart
  const overlays = useMemo(() => {
    const result = [];
    if (activeIndicators.includes('SMA 20')) result.push({ label: 'SMA 20', values: indicators.sma_20, color: '#60a5fa' });
    if (activeIndicators.includes('SMA 50')) result.push({ label: 'SMA 50', values: indicators.sma_50, color: '#f59e0b' });
    if (activeIndicators.includes('EMA 9')) result.push({ label: 'EMA 9', values: indicators.ema_9, color: '#a78bfa' });
    if (activeIndicators.includes('Bollinger Bands')) {
      result.push({ label: 'BB Upper', values: indicators.bollinger_bands.upper, color: 'rgba(99,102,241,0.4)', width: 1 });
      result.push({ label: 'BB Mid', values: indicators.bollinger_bands.middle, color: 'rgba(99,102,241,0.3)', width: 1 });
      result.push({ label: 'BB Lower', values: indicators.bollinger_bands.lower, color: 'rgba(99,102,241,0.4)', width: 1 });
    }
    return result;
  }, [indicators, activeIndicators]);

  const toggleIndicator = useCallback((ind: string) => {
    setActiveIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const structure = report?.timeframe_reports?.[timeframe]?.market_structure ?? null;
  const explanation = apiExplanation ?? null;
  const mtfAlignment = report?.multi_timeframe_alignment ?? null;

  const loading = apiLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Technical Analysis"
        description="Chart engine · 14 indicators · Multi-timeframe · AI explainability"
        badge="Phase 6"
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* ── Symbol + Timeframe + Indicator controls ── */}
      <div className="flex flex-wrap gap-3 items-start">
        {/* Symbol selector */}
        <div className="flex gap-1.5 flex-wrap">
          {MOCK_SYMBOLS.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm dark:shadow-none ${
                symbol === s
                  ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 self-center" />

        {/* Timeframe selector */}
        <div className="flex gap-1.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm dark:shadow-none ${
                timeframe === tf
                  ? 'bg-slate-800 dark:bg-slate-700 text-white'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 self-center" />

        {/* Indicators dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowIndicatorDropdown(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none transition-colors"
          >
            <Activity className="h-3 w-3" />
            Indicators ({activeIndicators.length})
            <ChevronDown className={`h-3 w-3 transition-transform ${showIndicatorDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showIndicatorDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 p-3 space-y-3"
              >
                {Object.entries(INDICATOR_GROUPS).map(([group, inds]) => (
                  <div key={group}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">{group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {inds.map(ind => (
                        <button
                          key={ind}
                          onClick={() => toggleIndicator(ind)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            activeIndicators.includes(ind)
                              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                          }`}
                        >
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Price summary bar & Main content ── */}
      {apiError || bars.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 border border-dashed border-rose-500/20 bg-rose-500/5 rounded-2xl p-6 text-center gap-3">
          <Activity className="h-10 w-10 text-rose-500/50" />
          <div>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
              {apiError ? 'Error Loading Technical Data' : 'No data available'}
            </p>
            <p className="text-[11px] text-rose-500/70 mt-1">
              {apiError ? apiError : 'The selected symbol or timeframe returned no data.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <motion.div
            key={symbol + timeframe}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2"
          >
            <StatBadge label="Last Price" value={lastClose.toFixed(5)} change={pctChange} />
            <StatBadge label="Open" value={(bars.at(-1)?.open ?? 0).toFixed(5)} />
            <StatBadge label="High" value={(bars.at(-1)?.high ?? 0).toFixed(5)} />
            <StatBadge label="Low" value={(bars.at(-1)?.low ?? 0).toFixed(5)} />
            <StatBadge
              label="RSI (14)"
              value={(indicators.rsi_14.filter((v): v is number => v !== null).at(-1) ?? 50).toFixed(1)}
            />
            <StatBadge
              label="Volume"
              value={((bars.at(-1)?.volume ?? 0) / 1_000_000).toFixed(2) + 'M'}
            />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{symbol} · {timeframe}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isUp ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isUp ? '+' : ''}{pctChange.toFixed(4)}%
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {(activeIndicators.includes('SMA 20') || activeIndicators.includes('SMA 50') || activeIndicators.includes('EMA 9')) && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-600 self-center">MA overlay active</span>
                    )}
                  </div>
                </div>
                <CandlestickChart data={bars} overlays={overlays} height={360} className="px-0" />
              </div>

              <div className="flex gap-2">
                {([
                  { id: 'rsi' as const, label: 'RSI' },
                  { id: 'macd' as const, label: 'MACD' },
                  { id: 'adx' as const, label: 'ADX Sim.' },
                  { id: 'volume' as const, label: 'Volume' },
                ]).map(({ id, label }) => (
                  <SubChartTab key={id} id={id} label={label} active={subChart === id} onClick={() => setSubChart(id)} />
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none overflow-hidden py-2 px-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={subChart}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {subChart === 'rsi' && (
                      <IndicatorPanel
                        title="RSI (14)"
                        values={indicators.rsi_14}
                        color="#818cf8"
                        overbought={70}
                        oversold={30}
                        height={130}
                      />
                    )}
                    {subChart === 'macd' && (
                      <IndicatorPanel
                        title="MACD (12,26,9)"
                        values={indicators.macd.line}
                        signal={indicators.macd.signal}
                        histogram={indicators.macd.histogram}
                        color="#34d399"
                        signalColor="#f97316"
                        zeroline
                        height={130}
                      />
                    )}
                    {subChart === 'adx' && (
                      <IndicatorPanel
                        title="Volatility Proxy"
                        values={bars.map((b, i) => {
                          if (i < 14) return null;
                          const slice = bars.slice(i - 14, i);
                          const atr = slice.reduce((acc, bar, j) => {
                            const prev = slice[j - 1] ?? bar;
                            return acc + Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close));
                          }, 0) / 14;
                          return atr;
                        })}
                        color="#fb923c"
                        height={130}
                      />
                    )}
                    {subChart === 'volume' && (
                      <IndicatorPanel
                        title="Volume"
                        values={bars.map(b => b.volume / 1_000_000)}
                        histogram={bars.map(b => b.volume / 1_000_000)}
                        color="#6366f1"
                        height={130}
                        zeroline
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <SectionTitle icon={Target}>Pattern Recognition</SectionTitle>
              <PatternsPanel
                patterns={(report?.timeframe_reports?.[timeframe] as any)?.patterns ?? []}
              />
            </div>

            <div className="space-y-4">
              <SectionTitle icon={Layers}>Multi-Timeframe</SectionTitle>
              {mtfAlignment ? <MTFAlignmentPanel alignment={mtfAlignment} /> : <div className="text-xs text-slate-500">Data unavailable</div>}

              <SectionTitle icon={Activity}>Market Structure</SectionTitle>
              {structure ? <MarketStructurePanel structure={structure} lastPrice={lastClose} /> : <div className="text-xs text-slate-500">Data unavailable</div>}

              <SectionTitle icon={Brain}>AI Explanation</SectionTitle>
              {explanation ? <ExplainabilityPanel explanation={explanation} /> : <div className="text-xs text-slate-500">Data unavailable</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
