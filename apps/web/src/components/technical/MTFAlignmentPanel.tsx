'use client';

import React from 'react';
import type { MTFAlignment } from '../../lib/hooks/useTechnicalAnalysis';
import { Layers } from 'lucide-react';

interface MTFAlignmentPanelProps {
  alignment: MTFAlignment;
  className?: string;
}

const TF_ORDER = ['1H', '4H', '1D', '1W', '1M'];

const TREND_COLORS: Record<string, { text: string; dot: string }> = {
  BULLISH: { text: 'text-emerald-600 dark:text-emerald-400 font-bold', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  BEARISH: { text: 'text-rose-600 dark:text-rose-400 font-bold', dot: 'bg-rose-500 dark:bg-rose-400' },
  NEUTRAL: { text: 'text-slate-600 dark:text-slate-400 font-medium', dot: 'bg-slate-400 dark:bg-slate-600' },
  VOLATILE: { text: 'text-amber-600 dark:text-amber-400 font-bold', dot: 'bg-amber-500 dark:bg-amber-400' },
  CONSOLIDATING: { text: 'text-sky-600 dark:text-sky-400 font-bold', dot: 'bg-sky-500 dark:bg-sky-400' },
};

function AlignmentScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
  const bg = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{pct}%</span>
    </div>
  );
}

export function MTFAlignmentPanel({ alignment, className = '' }: MTFAlignmentPanelProps) {
  const primaryColors = TREND_COLORS[alignment.primary_trend] ?? TREND_COLORS.NEUTRAL;
  const conf = Math.round(alignment.mtf_confidence * 100);

  return (
    <div className={`rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Multi-Timeframe</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Alignment Analysis</p>
        </div>
      </div>

      {/* Primary trend badge */}
      <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800/50">
        <div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Primary Trend</p>
          <div className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${primaryColors.dot}`} />
            <span className={`text-sm ${primaryColors.text}`}>{alignment.primary_trend}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">MTF Confidence</p>
          <span className={`text-sm font-bold ${conf >= 70 ? 'text-emerald-600 dark:text-emerald-400' : conf >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {conf}%
          </span>
        </div>
      </div>

      {/* Alignment score bar */}
      <div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Alignment Score</p>
        <AlignmentScore score={alignment.alignment_score} />
      </div>

      {/* Per-timeframe table */}
      <div className="space-y-2 pt-1">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">By Timeframe</p>
        <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/40">
          {TF_ORDER.filter(tf => alignment.timeframe_alignment[tf]).map(tf => {
            const trend = alignment.timeframe_alignment[tf];
            const cols = TREND_COLORS[trend] ?? TREND_COLORS.NEUTRAL;
            return (
              <div key={tf} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                <span className="text-slate-600 dark:text-slate-400 font-mono font-medium">{tf}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${cols.dot}`} />
                  <span className={`font-semibold text-xs ${cols.text}`}>{trend}</span>
                </div>
              </div>
            );
          })}
          {/* Any extra timeframes not in TF_ORDER */}
          {Object.entries(alignment.timeframe_alignment)
            .filter(([tf]) => !TF_ORDER.includes(tf))
            .map(([tf, trend]) => {
              const cols = TREND_COLORS[trend as string] ?? TREND_COLORS.NEUTRAL;
              return (
                <div key={tf} className="flex items-center justify-between text-xs pt-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-mono font-medium">{tf}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${cols.dot}`} />
                    <span className={`font-semibold text-xs ${cols.text}`}>{trend as string}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
