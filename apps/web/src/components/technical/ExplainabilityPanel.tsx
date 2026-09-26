'use client';

import React from 'react';
import type { TechnicalExplanation } from '../../lib/hooks/useTechnicalAnalysis';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ExplainabilityPanelProps {
  explanation: TechnicalExplanation;
  className?: string;
}

const SIGNAL_CONFIG = {
  STRONG_BUY: { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', Icon: TrendingUp },
  BUY: { label: 'Buy', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: TrendingUp },
  NEUTRAL: { label: 'Neutral', color: 'text-slate-300', bg: 'bg-slate-800/60', border: 'border-slate-700/30', Icon: Minus },
  SELL: { label: 'Sell', color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/20', Icon: TrendingDown },
  STRONG_SELL: { label: 'Strong Sell', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30', Icon: TrendingDown },
};

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-emerald-400' : pct >= 45 ? 'bg-amber-400' : 'bg-slate-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800/80">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-white tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}

export function ExplainabilityPanel({ explanation, className = '' }: ExplainabilityPanelProps) {
  const sigCfg = SIGNAL_CONFIG[explanation.primary_signal as keyof typeof SIGNAL_CONFIG] ?? SIGNAL_CONFIG.NEUTRAL;
  const Icon = sigCfg.Icon;

  return (
    <div className={`rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Brain className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">AI Explainability</p>
          <p className="text-sm font-bold text-white">{explanation.symbol} — Signal Analysis</p>
        </div>
      </div>

      {/* Primary signal */}
      <div className={`flex items-center justify-between rounded-xl p-3 border ${sigCfg.border} ${sigCfg.bg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${sigCfg.color}`} />
          <span className={`text-sm font-bold ${sigCfg.color}`}>{sigCfg.label}</span>
        </div>
        <div className="w-36">
          <ConfidenceMeter value={explanation.confidence} />
        </div>
      </div>

      {/* Technical reasoning */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Technical Reasoning</p>
        <p className="text-xs text-slate-300 leading-relaxed">{explanation.technical_reasoning}</p>
      </div>

      {/* Capital flow reasoning */}
      {explanation.capital_flow_reasoning && (
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-indigo-400" />
            <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">Capital Flow Context</p>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{explanation.capital_flow_reasoning}</p>
        </div>
      )}

      {/* Confirmations */}
      {explanation.indicator_confirmations.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Indicator Confirmations</p>
          <ul className="space-y-1.5">
            {explanation.indicator_confirmations.map((conf, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                {conf}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternative scenarios */}
      {explanation.alternative_scenarios.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Alternative Scenarios</p>
          <div className="space-y-2">
            {explanation.alternative_scenarios.map((sc, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                <div className="shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">
                    {Math.round(sc.probability * 100)}%
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{sc.scenario}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk factors */}
      {explanation.risk_factors.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Risk Factors</p>
          <ul className="space-y-1.5">
            {explanation.risk_factors.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
