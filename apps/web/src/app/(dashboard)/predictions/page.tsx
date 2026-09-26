'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import {
  useMultiHorizonForecasts,
  MultiHorizonForecastItem,
  ForecastScenario,
  ForecastAnalogue,
} from '../../../lib/hooks/usePredictions';
import { ProvenanceModal } from '../../../components/dashboard/provenance-modal';
import { useExplainability } from '../../../lib/hooks/useExplainability';
import { useAuthStore } from '../../../lib/store/authStore';
import { SubscriptionGate } from '../../../components/subscription/subscription-gate';
import {
  Brain,
  Sparkles,
  Lock,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  HelpCircle,
  Activity,
  Layers,
  ChevronDown,
  ShieldAlert,
  GitBranch,
  History,
  Sliders,
  FileText,
  Search,
} from 'lucide-react';

const HORIZONS = [
  { id: 'ALL', label: 'All Horizons' },
  { id: 'SHORT_TERM', label: 'Short-Term (1M–6M)' },
  { id: 'MEDIUM_TERM', label: 'Medium-Term (1Y)' },
  { id: 'LONG_TERM', label: 'Long-Term (3Y–5Y)' },
];

function ConfidenceStateBadge({ state }: { state: string }) {
  const cfg =
    {
      ALIGNED_HIGH_CONFIDENCE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      MIXED_EVIDENCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      UNCONFIRMED_EVENT_SIGNAL: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      UNCONFIRMED_INSUFFICIENT_DATA: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    }[state] || 'bg-slate-800 text-slate-400 border-slate-700';

  const label = state.replace(/_/g, ' ');

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${cfg}`}>
      {label}
    </span>
  );
}

function ScenarioTypeBadge({ type }: { type: ForecastScenario['type'] }) {
  const cfg = {
    CONTINUATION: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    ESCALATION: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    'DE-ESCALATION': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  }[type];

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg}`}>
      {type}
    </span>
  );
}

interface ForecastCardProps {
  forecast: MultiHorizonForecastItem;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

function ForecastCard({ forecast, onSelect, isSelected }: ForecastCardProps) {
  const isInsufficient = forecast.status === 'INSUFFICIENT_EVIDENCE';

  return (
    <motion.div
      layout
      onClick={() => onSelect(forecast.id)}
      className={`p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
        isSelected
          ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10'
          : isInsufficient
          ? 'border-rose-300 dark:border-rose-900/40 bg-rose-50/40 dark:bg-slate-900/20 hover:border-rose-400 dark:hover:border-rose-800/60'
          : 'border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 hover:border-indigo-300 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-sm dark:shadow-none'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <Clock className="h-3 w-3 text-indigo-500 dark:text-indigo-400" /> {forecast.horizon.replace('_', ' ')}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              {forecast.affected_country || forecast.affected_region || 'Global Assets'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{forecast.affected_sector || 'Cross-Asset Rotation'}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <ConfidenceStateBadge state={forecast.confidence_state} />
            {isInsufficient && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> INSUFFICIENT EVIDENCE
              </span>
            )}
          </div>
        </div>

        {/* Mid bar */}
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-200/80 dark:border-slate-800/40 text-xs">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Est. Rotation</p>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">
              {isInsufficient ? 'N/A' : `$${forecast.estimated_rotation_usd_bn.toFixed(1)}B`}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Confidence</p>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
              {Math.round(forecast.overall_confidence * 100)}%
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Scenarios</p>
            <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">
              {forecast.scenarios.length} Generated
            </p>
          </div>
        </div>

        {/* Evidence Status Badges */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-2 py-0.5 rounded ${forecast.data_snapshot?.has_market_data ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            Market Data: {forecast.data_snapshot?.has_market_data ? 'Available' : 'Unavailable'}
          </span>
          <span className={`px-2 py-0.5 rounded ${forecast.data_snapshot?.has_historical_analogues ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            Analogues: {forecast.data_snapshot?.has_historical_analogues ? 'Matched' : 'None'}
          </span>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
          <span>Engine V7.1 Multi-Horizon</span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
            Why this scenario? <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function PredictionsPage() {
  const [selectedHorizon, setSelectedHorizon] = useState('ALL');
  const [selectedForecastId, setSelectedForecastId] = useState<string | null>(null);
  const [inferenceRunning, setInferenceRunning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { canAccessPro, isSuperAdmin } = useAuthStore();
  const isPro = canAccessPro();

  const { forecasts, loading, refetch, generateForecast } = useMultiHorizonForecasts({
    horizon: selectedHorizon === 'ALL' ? undefined : selectedHorizon,
  });

  const { getForecastExplanation, explanation, loading: explainLoading } = useExplainability();

  // Set default selected forecast
  React.useEffect(() => {
    if (forecasts.length > 0 && !selectedForecastId) {
      setSelectedForecastId(forecasts[0].id);
    }
  }, [forecasts, selectedForecastId]);

  const activeForecast = useMemo(() => {
    return forecasts.find(f => f.id === selectedForecastId) ?? forecasts[0] ?? null;
  }, [forecasts, selectedForecastId]);

  const handleOpenProvenance = useCallback(async () => {
    if (!activeForecast) return;
    setIsModalOpen(true);
    await getForecastExplanation(activeForecast.id);
  }, [activeForecast, getForecastExplanation]);

  const triggerInference = useCallback(async () => {
    setInferenceRunning(true);
    try {
      await generateForecast('seed_event_1', ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM']);
      await refetch();
    } catch (err) {
      console.error('Failed to trigger multi-horizon scenario forecast:', err);
    } finally {
      setInferenceRunning(false);
    }
  }, [generateForecast, refetch]);

  const isCurrentHorizonLocked =
    (selectedHorizon === 'MEDIUM_TERM' || selectedHorizon === 'LONG_TERM') && !isPro;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Horizon Scenario Intelligence"
        description="GEOCAP-X V7.1 evidence-backed scenario forecasting with explicit structural assumptions and historical analogue matching"
        badge="V7.1 Engine"
        actions={
          <button
            onClick={triggerInference}
            disabled={inferenceRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Play className={`h-3 w-3 ${inferenceRunning ? 'animate-spin' : ''}`} />
            {inferenceRunning ? 'Generating Scenarios...' : 'Run Forecast Engine'}
          </button>
        }
      />

      {/* Horizon selector tabs */}
      <div className="flex gap-2 flex-wrap">
        {HORIZONS.map(h => {
          const isProRequired = (h.id === 'MEDIUM_TERM' || h.id === 'LONG_TERM') && !isPro;
          return (
            <button
              key={h.id}
              onClick={() => {
                setSelectedHorizon(h.id);
                setSelectedForecastId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedHorizon === h.id
                  ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300'
                  : 'border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {h.label}
              {isProRequired && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  PRO
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isCurrentHorizonLocked ? (
        <SubscriptionGate
          featureName={`${selectedHorizon === 'MEDIUM_TERM' ? 'Medium-Term (1Y)' : 'Long-Term (3Y–5Y)'} AI Predictions`}
          description="Extended-horizon macroeconomic trajectory models and structural analogue matching require an active Pro Trader or Enterprise tier."
          requiredTier="pro"
        >
          <div />
        </SubscriptionGate>
      ) : (
        /* Main split dashboard view */
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-6 items-start">
          {/* Left column: List of forecasts */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Scenario Outlooks ({forecasts.length})</h2>
            </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array(4).fill(null).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-4 w-20 geocap-skeleton" />
                    <div className="h-4 w-24 geocap-skeleton" />
                  </div>
                  <div className="h-5 w-3/4 geocap-skeleton" />
                  <div className="h-3 w-1/2 geocap-skeleton" />
                  <div className="grid grid-cols-3 gap-3 py-3">
                    <div className="h-8 geocap-skeleton" />
                    <div className="h-8 geocap-skeleton" />
                    <div className="h-8 geocap-skeleton" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5 w-28 geocap-skeleton" />
                    <div className="h-5 w-24 geocap-skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : forecasts.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 text-center space-y-3">
              <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">No Forecast Records Loaded</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Click "Run Forecast Engine" to execute evidence-backed multi-horizon scenario generation.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forecasts.map(f => (
                <ForecastCard
                  key={f.id}
                  forecast={f}
                  onSelect={setSelectedForecastId}
                  isSelected={selectedForecastId === f.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column: Deep-dive "Why this scenario?" detail panel */}
        <div>
          {activeForecast ? (
            <motion.div
              layoutId={`explain-${activeForecast.id}`}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 sticky top-24 backdrop-blur-xl shadow-md dark:shadow-none"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-slate-800/60 pb-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                    <Brain className="h-3.5 w-3.5" /> Why this scenario?
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {activeForecast.affected_country || activeForecast.affected_region || 'Global Assets'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeForecast.horizon.replace('_', ' ')} Outlook</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ConfidenceStateBadge state={activeForecast.confidence_state} />
                  <button
                    onClick={handleOpenProvenance}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-all"
                  >
                    <Search className="h-3 w-3" /> Inspect Provenance & Evidence
                  </button>
                </div>
              </div>

              {/* Status Banner if Insufficient Evidence */}
              {activeForecast.status === 'INSUFFICIENT_EVIDENCE' && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4" /> INSUFFICIENT EVIDENCE
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    The engine strictly refuses to generate guaranteed predictions when underlying market or historical data layers are insufficient.
                  </p>
                </div>
              )}

              {/* Generated Evidence-Backed Scenarios */}
              {activeForecast.scenarios.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Evidence-Backed Scenarios ({activeForecast.scenarios.length})
                  </h4>

                  <div className="space-y-3">
                    {activeForecast.scenarios.map((sc, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{sc.title}</span>
                          <ScenarioTypeBadge type={sc.type} />
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{sc.description}</p>

                        {/* Structural Assumptions */}
                        {sc.assumptions.length > 0 && (
                          <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Structural Assumptions</span>
                            <ul className="space-y-1">
                              {sc.assumptions.map((asm, i) => (
                                <li key={i} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                  <span className="text-indigo-500 font-bold">•</span> {asm}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Supporting vs Opposing Evidence */}
                        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px]">
                          {sc.supporting_evidence.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Supporting Evidence
                              </span>
                              <ul className="space-y-0.5 text-slate-700 dark:text-slate-300">
                                {sc.supporting_evidence.map((se, i) => (
                                  <li key={i} className="pl-4">• {se}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {sc.opposing_evidence.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Opposing / Contradictory Evidence
                              </span>
                              <ul className="space-y-0.5 text-slate-700 dark:text-slate-300">
                                {sc.opposing_evidence.map((oe, i) => (
                                  <li key={i} className="pl-4">• {oe}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Historical Analogues */}
              {activeForecast.analogues.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/60">
                  <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Matched Historical Analogues ({activeForecast.analogues.length})
                  </h4>

                  <div className="space-y-2">
                    {activeForecast.analogues.map((an, i) => (
                      <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white">{an.historical_event_title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono">
                            {Math.round(an.similarity_score * 100)}%
                          </span>
                        </div>
                        {/* Similarity bar */}
                        <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${Math.round(an.similarity_score * 100)}%` }}
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap text-[10px]">
                          {an.matching_attributes.map((attr, ai) => (
                            <span key={ai} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 border border-slate-200/80 dark:border-transparent font-mono">
                              {attr}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          <span className="text-slate-500">Outcome:</span> {an.observed_outcome}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sensitivity Analysis */}
              {activeForecast.sensitivity && (
                <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/60">
                  <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Sensitivity Analysis
                  </h4>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-600 dark:text-slate-400">Primary Driver</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-300 font-mono">
                        {activeForecast.sensitivity.primary_sensitivity_driver}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {activeForecast.sensitivity.sensitivity_breakdown.map((sb, sbi) => {
                        const absMax = Math.max(
                          ...activeForecast.sensitivity!.sensitivity_breakdown.map(x => Math.abs(x.confidence_delta))
                        ) || 1;
                        const barWidth = Math.min(Math.abs(sb.confidence_delta) / absMax * 100, 100);
                        const isHigh = sb.impact_level === 'HIGH';
                        return (
                          <div key={sbi} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-700 dark:text-slate-300">{sb.factor.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                                  isHigh ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                                }`}>
                                  {sb.impact_level}
                                </span>
                                <span className="font-mono text-slate-900 dark:text-white font-semibold w-12 text-right">
                                  {sb.confidence_delta > 0 ? `+${sb.confidence_delta.toFixed(2)}` : sb.confidence_delta.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800/80">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isHigh ? 'bg-rose-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-96 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 flex flex-col items-center justify-center text-center p-6 gap-3">
              <Brain className="h-10 w-10 text-slate-400 dark:text-slate-700" />
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Select a Forecast Outlook</p>
                <p className="text-[11px] text-slate-500 mt-1">Select any forecast card to inspect why this scenario was generated.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* V8.1 Lineage & Provenance Modal Drawer */}
      <ProvenanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        explanation={explanation}
        loading={explainLoading}
      />
    </div>
  );
}
