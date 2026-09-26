'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DashboardStat } from '../../lib/hooks/useDashboardStats';

interface StatCardProps {
  stat: DashboardStat;
  index?: number;
}

function Sparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'neutral' }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const color = trend === 'up' ? '#22c55e' : trend === 'down' ? '#f43f5e' : '#94a3b8';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

export function StatCard({ stat, index = 0 }: StatCardProps) {
  const TrendIcon =
    stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    stat.trend === 'up'
      ? 'text-emerald-400'
      : stat.trend === 'down'
      ? 'text-rose-400'
      : 'text-slate-400';
  const trendBg =
    stat.trend === 'up'
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : stat.trend === 'down'
      ? 'bg-rose-500/10 border-rose-500/20'
      : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="relative p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none hover:border-indigo-300 dark:hover:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/60 transition-all duration-300 group"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-violet-500/0 group-hover:from-indigo-500/5 group-hover:to-violet-500/5 transition-all duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">
              {stat.prefix}{stat.value}{stat.suffix}
            </p>
          </div>
          <div className="flex-shrink-0 mt-1">
            <Sparkline data={stat.sparkline} trend={stat.trend} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${trendBg} ${trendColor}`}>
            <TrendIcon className="h-2.5 w-2.5" />
            {stat.change > 0 ? '+' : ''}{stat.change}%
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{stat.changeLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}
