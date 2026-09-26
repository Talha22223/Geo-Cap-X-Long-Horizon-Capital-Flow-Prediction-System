'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EconomicEvent } from '../../lib/hooks/useEconomicEvents';
import { CalendarDays, Clock } from 'lucide-react';

const IMPACT_CONFIG = {
  high: { label: 'High', color: 'text-rose-500 dark:text-rose-400', dot: 'bg-rose-500', badge: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' },
  medium: { label: 'Med', color: 'text-amber-500 dark:text-amber-400', dot: 'bg-amber-500', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', color: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400 dark:bg-slate-600', badge: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400' },
};

const FLAG_EMOJI: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', GB: '🇬🇧', JP: '🇯🇵', DE: '🇩🇪',
  CN: '🇨🇳', CA: '🇨🇦', AU: '🇦🇺', CH: '🇨🇭',
};

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface EconomicEventsProps {
  events: EconomicEvent[];
  limit?: number;
}

export function EconomicEvents({ events, limit = 5 }: EconomicEventsProps) {
  const displayed = events.slice(0, limit);

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 gap-2 text-center">
        <CalendarDays className="h-7 w-7 text-slate-400 dark:text-slate-700" />
        <p className="text-xs font-semibold text-slate-900 dark:text-white">No intelligence events available</p>
        <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
          Run the ingestion pipeline to extract and normalize events from source data.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {displayed.map((event, i) => {
        const impact = IMPACT_CONFIG[event.impact] ?? IMPACT_CONFIG.low;
        const flag = FLAG_EMOJI[event.countryCode] ?? '🌐';
        return (
          <motion.li
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800/50 bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700/50 transition-all group shadow-sm dark:shadow-none"
          >
            {/* Impact indicator */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <span className="text-sm">{flag}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${impact.dot}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 leading-snug group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                {event.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${impact.badge}`}>
                  {impact.label}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{event.currency}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <CalendarDays className="h-2.5 w-2.5" /> {formatEventDate(event.date)}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="h-2.5 w-2.5" /> {event.time}
                </span>
              </div>
            </div>

            {/* Forecast/Previous */}
            {(event.forecast || event.previous) && (
              <div className="flex-shrink-0 text-right">
                {event.forecast && (
                  <p className="text-[10px] text-slate-500">
                    <span className="text-slate-500">Fcst </span>
                    <span className="text-slate-900 dark:text-slate-300 font-semibold">{event.forecast}</span>
                  </p>
                )}
                {event.previous && (
                  <p className="text-[10px] text-slate-500">
                    Prev {event.previous}
                  </p>
                )}
              </div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
