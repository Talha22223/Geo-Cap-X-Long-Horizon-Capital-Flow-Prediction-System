'use client';

import React from 'react';
import type { PatternMatch } from '../../lib/hooks/useTechnicalAnalysis';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

interface PatternCardProps {
  pattern: PatternMatch;
}

interface PatternsPanelProps {
  patterns: PatternMatch[];
  className?: string;
}

function PatternCard({ pattern }: PatternCardProps) {
  const isBull = pattern.pattern_type === 'BULLISH';
  const confPct = Math.round(pattern.confidence * 100);

  return (
    <div className={`p-3 rounded-xl border ${
      isBull ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isBull
            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            : <TrendingDown className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          }
          <span className="text-xs font-bold text-white">{pattern.pattern_name}</span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          isBull ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
        }`}>
          {isBull ? 'BULLISH' : 'BEARISH'}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Confidence</span>
          <span className={`font-bold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>{confPct}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-slate-800/80">
          <div
            className={`h-1 rounded-full transition-all duration-700 ${isBull ? 'bg-emerald-400' : 'bg-rose-400'}`}
            style={{ width: `${confPct}%` }}
          />
        </div>
      </div>

      {/* Target price */}
      {pattern.target_price > 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          <Target className="h-3 w-3 text-slate-500" />
          <span className="text-[10px] text-slate-500">Target</span>
          <span className={`text-[10px] font-bold font-mono ${isBull ? 'text-emerald-300' : 'text-rose-300'}`}>
            {pattern.target_price.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

export function PatternsPanel({ patterns, className = '' }: PatternsPanelProps) {
  const found = patterns.filter(p => p.found);

  if (found.length === 0) {
    return (
      <div className={`rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 ${className}`}>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Pattern Recognition</p>
        <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
          <Target className="h-8 w-8 text-slate-700" />
          <p className="text-xs text-slate-600">No patterns detected in current data range</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pattern Recognition</p>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400">
          {found.length} detected
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {found.map((p, i) => (
          <PatternCard key={i} pattern={p} />
        ))}
      </div>
    </div>
  );
}
