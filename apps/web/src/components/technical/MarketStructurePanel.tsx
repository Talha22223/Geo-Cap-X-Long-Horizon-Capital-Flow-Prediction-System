'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Shield, Zap, Target } from 'lucide-react';
import type { MarketStructure } from '../../lib/hooks/useTechnicalAnalysis';

interface MarketStructurePanelProps {
  structure: MarketStructure;
  lastPrice: number;
  className?: string;
}

const TREND_CONFIG = {
  BULLISH: {
    label: 'Bullish Trend',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-400',
  },
  BEARISH: {
    label: 'Bearish Trend',
    icon: TrendingDown,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    badge: 'bg-rose-500/15 text-rose-400',
  },
  NEUTRAL: {
    label: 'Neutral',
    icon: Minus,
    color: 'text-slate-400',
    bg: 'bg-slate-800/50',
    border: 'border-slate-700/30',
    badge: 'bg-slate-700/50 text-slate-400',
  },
  VOLATILE: {
    label: 'Volatile',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badge: 'bg-amber-500/15 text-amber-400',
  },
  CONSOLIDATING: {
    label: 'Consolidating',
    icon: Shield,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    badge: 'bg-sky-500/15 text-sky-400',
  },
} as const;

function TrendStrengthBar({ strength }: { strength: number }) {
  const pct = Math.min(100, Math.max(0, strength));
  const label = pct < 20 ? 'Weak' : pct < 40 ? 'Developing' : pct < 60 ? 'Moderate' : pct < 80 ? 'Strong' : 'Very Strong';
  const color = pct < 20 ? 'bg-slate-500' : pct < 40 ? 'bg-amber-400' : pct < 60 ? 'bg-indigo-400' : pct < 80 ? 'bg-emerald-400' : 'bg-emerald-300';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Trend Strength (ADX)</span>
        <span className="font-semibold text-white">{strength.toFixed(1)} — {label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800/80">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MarketStructurePanel({ structure, lastPrice, className = '' }: MarketStructurePanelProps) {
  const cfg = TREND_CONFIG[structure.trend as keyof typeof TREND_CONFIG] ?? TREND_CONFIG.NEUTRAL;
  const Icon = cfg.icon;

  const supports = structure.support_resistance_levels.filter(l => l < lastPrice).sort((a, b) => b - a).slice(0, 3);
  const resistances = structure.support_resistance_levels.filter(l => l > lastPrice).sort((a, b) => a - b).slice(0, 3);

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Market Structure</p>
            <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
          </div>
        </div>
        {structure.breakouts.length > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            structure.breakouts[0].type === 'BREAKOUT' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          }`}>
            {structure.breakouts[0].type === 'BREAKOUT' ? '↑ BREAKOUT' : '↓ BREAKDOWN'}
            {structure.breakouts[0].volume_confirmed && ' ✓'}
          </span>
        )}
      </div>

      {/* Trend strength */}
      <TrendStrengthBar strength={structure.trend_strength} />

      {/* S/R Levels */}
      <div className="grid grid-cols-2 gap-3">
        {/* Resistance */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-rose-400/60 font-semibold">Resistance</p>
          {resistances.length === 0 && <p className="text-xs text-slate-600">—</p>}
          {resistances.map((level, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">R{i + 1}</span>
              <span className="font-mono font-semibold text-rose-400">{level.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Support */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-semibold">Support</p>
          {supports.length === 0 && <p className="text-xs text-slate-600">—</p>}
          {supports.map((level, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">S{i + 1}</span>
              <span className="font-mono font-semibold text-emerald-400">{level.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent pivots */}
      {(structure.swing_highs.length > 0 || structure.swing_lows.length > 0) && (
        <div className="pt-2 border-t border-slate-800/50">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Recent Pivots</p>
          <div className="flex flex-wrap gap-1.5">
            {structure.swing_highs.slice(-3).map((p, i) => (
              <span key={`sh-${i}`} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                p.type === 'HH' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>{p.type} {p.price.toFixed(2)}</span>
            ))}
            {structure.swing_lows.slice(-3).map((p, i) => (
              <span key={`sl-${i}`} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                p.type === 'HL' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>{p.type} {p.price.toFixed(2)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
