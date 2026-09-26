'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';

const NEWS_ITEMS = [
  { id: 'n-01', headline: 'Fed Signals Cautious Approach to Rate Cuts Amid Persistent Inflation', source: 'Reuters', category: 'Monetary Policy', time: '2h ago', impact: 'High', href: '#' },
  { id: 'n-02', headline: 'ECB Policymakers Signal December Rate Cut as Eurozone Growth Slows', source: 'Bloomberg', category: 'Monetary Policy', time: '4h ago', impact: 'High', href: '#' },
  { id: 'n-03', headline: 'China Capital Outflows Accelerate as Yuan Weakens Past 7.25', source: 'FT', category: 'Capital Flows', time: '6h ago', impact: 'High', href: '#' },
  { id: 'n-04', headline: 'US Non-Farm Payrolls Beat Expectations at 206K; Wage Growth Moderates', source: 'WSJ', category: 'Employment', time: '8h ago', impact: 'Medium', href: '#' },
  { id: 'n-05', headline: 'UK CPI Falls to 2.3%, Boosting BOE Rate Cut Expectations for August', source: 'Guardian', category: 'Inflation', time: '10h ago', impact: 'Medium', href: '#' },
  { id: 'n-06', headline: 'Japan Intervenes in FX Market as USD/JPY Approaches 160 Level', source: 'Nikkei', category: 'Currency', time: '12h ago', impact: 'High', href: '#' },
];

const IMPACT_COLORS: Record<string, string> = {
  High: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Low: 'text-slate-400 bg-slate-800 border-slate-700',
};

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = React.useState('All');
  const categories = ['All', ...Array.from(new Set(NEWS_ITEMS.map((n) => n.category)))];
  const filtered = activeCategory === 'All' ? NEWS_ITEMS : NEWS_ITEMS.filter((n) => n.category === activeCategory);

  return (
    <div className="space-y-6">
      <PageHeader
        title="News"
        description="Curated macroeconomic news relevant to capital flow prediction"
        badge="Curated"
      />

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((item, i) => (
          <motion.a
            key={item.id}
            href={item.href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-sm dark:shadow-none transition-all group"
          >
            <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Newspaper className="h-4 w-4 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 leading-snug group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                {item.headline}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${IMPACT_COLORS[item.impact]}`}>
                  {item.impact}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-500 font-medium">{item.category}</span>
                <span className="text-[10px] text-slate-700 dark:text-slate-400 font-semibold">{item.source}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <Clock className="h-2.5 w-2.5" /> {item.time}
                </span>
              </div>
            </div>
            <ExternalLink className="flex-shrink-0 h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors mt-1" />
          </motion.a>
        ))}
      </div>
    </div>
  );
}
