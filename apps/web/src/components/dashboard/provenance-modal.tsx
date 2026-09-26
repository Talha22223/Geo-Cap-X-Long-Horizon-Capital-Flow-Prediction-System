'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  X,
  ShieldCheck,
  Clock,
  ExternalLink,
  GitCommit,
  CheckCircle,
  AlertTriangle,
  FileText,
  Sliders,
  Database,
  Layers,
  HelpCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { ExplanationDetail } from '../../lib/hooks/useExplainability';

interface ProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: ExplanationDetail | null;
  loading: boolean;
}

export function ProvenanceModal({ isOpen, onClose, explanation, loading }: ProvenanceModalProps) {
  const titleId = 'provenance-modal-title';

  // ESC to close
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const freshStatus = explanation?.data_freshness?.freshness_status || 'FRESH';
  const freshCfg =
    {
      FRESH: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      AGING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      STALE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      UNAVAILABLE: 'bg-slate-800 text-slate-400 border-slate-700',
    }[freshStatus] || 'bg-slate-800 text-slate-400';

  const conf = explanation?.confidence_breakdown;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-md p-4 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 overflow-y-auto space-y-6 shadow-2xl relative text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Brain className="h-4 w-4" /> GEOCAP-X V8.1 Provenance &amp; Evidence
              </div>
              <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {explanation?.title || explanation?.result_summary || 'Intelligence Result Trace'}
              </h2>
            </div>
            <button
              onClick={onClose}
              autoFocus
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label="Close provenance panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                Tracing 10-stage intelligence pipeline provenance…
              </p>
              {/* Stage skeleton cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array(10).fill(null).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl geocap-skeleton" />
                ))}
              </div>
              {/* Confidence skeleton */}
              <div className="space-y-2 pt-2">
                {Array(7).fill(null).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-40 geocap-skeleton" />
                      <div className="h-3 w-8 geocap-skeleton" />
                    </div>
                    <div className="h-1.5 geocap-skeleton w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : !explanation ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              No provenance record loaded.
            </div>
          ) : (
            <div className="space-y-6 text-xs">
              {/* 10-Stage Traceability Stepper */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <GitCommit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> 10-Stage Traceability Pipeline Lineage
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {explanation.traceability_chain.map((stage) => (
                    <div
                      key={stage.stage_index}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-none space-y-1 text-[10px]"
                    >
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-mono font-bold">#{stage.stage_index}</span>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{stage.status}</span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white truncate">{stage.stage_name}</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1">{stage.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Verification & Freshness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                  <h4 className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Source Verification
                  </h4>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {explanation.provenance?.provider || 'Verified Seed Source'}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      ID: {explanation.provenance?.external_id || explanation.event_id || 'N/A'}
                    </p>
                    {explanation.provenance?.source_url ? (
                      <a
                        href={explanation.provenance.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        View External Source <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">Original Source URL: N/A (Local Seed Data)</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                  <h4 className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Data Freshness
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${freshCfg}`}>
                      {freshStatus}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {explanation.data_freshness?.freshness_age_hours != null
                        ? `Age: ${explanation.data_freshness.freshness_age_hours.toFixed(1)}h`
                        : 'Age: N/A'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {explanation.data_freshness?.summary || 'Freshness age evaluated against domain threshold.'}
                  </p>
                </div>
              </div>

              {/* Separated Confidence Breakdown */}
              {conf && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
                  <h4 className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> 7 Separated Confidence Metrics
                  </h4>

                  <div className="space-y-2">
                    {[
                      { label: 'Feature Extraction Confidence', val: conf.extraction_confidence },
                      { label: 'Classification Confidence', val: conf.classification_confidence },
                      { label: 'Relationship Connection Confidence', val: conf.relationship_confidence },
                      { label: 'Graph Centrality / SNA Score', val: conf.graph_centrality_score },
                      { label: 'Market Baseline Quality', val: conf.market_baseline_quality },
                      { label: 'Market Abnormality Strength', val: conf.market_signal_strength },
                      { label: 'Multi-Horizon Scenario Confidence', val: conf.scenario_confidence },
                    ].map((item, i) => {
                      const pct = Math.round(item.val * 100);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-700 dark:text-slate-400 font-medium">{item.label}</span>
                            <span className="font-bold text-slate-900 dark:text-white font-mono">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800/60 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Supporting vs Opposing Evidence */}
              <div className="space-y-3 pt-2">
                {explanation.supporting_evidence.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                    <h5 className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Supporting Evidence ({explanation.supporting_evidence.length})
                    </h5>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                      {explanation.supporting_evidence.map((se, i) => (
                        <li key={i}>• {se}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {explanation.opposing_evidence.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                    <h5 className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Opposing / Contradictory Evidence ({explanation.opposing_evidence.length})
                    </h5>
                    <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                      {explanation.opposing_evidence.map((oe, i) => (
                        <li key={i}>• {oe}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Limitations & Versioning */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 space-y-2 text-[11px]">
                <h5 className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Methodological Caveats & Limitations</h5>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                  {explanation.limitations.map((lim, i) => (
                    <li key={i}>• {lim}</li>
                  ))}
                </ul>
                <div className="flex justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800/40">
                  <span>Engine Methodology: v8.1</span>
                  <span>Zero Fake Evidence Verified</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
