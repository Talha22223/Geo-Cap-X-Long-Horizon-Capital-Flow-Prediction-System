'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, X, Globe, TrendingUp, DollarSign, BarChart2 } from 'lucide-react';
import type { WatchlistItem } from '../../lib/store/watchlistStore';
import { useWatchlistStore } from '../../lib/store/watchlistStore';

// Mock price data for demo
const MOCK_PRICES: Record<string, { price: string; change: number }> = {
  'EUR/USD': { price: '1.0842', change: -0.12 },
  'GBP/USD': { price: '1.2715', change: 0.34 },
  'USD/JPY': { price: '157.82', change: 0.67 },
  'USD/CHF': { price: '0.8961', change: -0.08 },
  'DXY': { price: '104.23', change: 0.15 },
  'VIX': { price: '13.42', change: -2.10 },
  'US10Y': { price: '4.28%', change: -0.03 },
};

const CATEGORY_ICON: Record<WatchlistItem['category'], React.ElementType> = {
  currency: Globe,
  equity: TrendingUp,
  commodity: DollarSign,
  bond: BarChart2,
  crypto: DollarSign,
  index: BarChart2,
};

interface WatchlistItemRowProps {
  item: WatchlistItem;
  watchlistId: string;
}

export function WatchlistItemRow({ item, watchlistId }: WatchlistItemRowProps) {
  const { toggleFavorite, removeItem } = useWatchlistStore();
  const mockData = MOCK_PRICES[item.symbol];
  const CategoryIcon = CATEGORY_ICON[item.category] ?? Globe;
  const isPositive = (mockData?.change ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700/50 shadow-sm dark:shadow-none transition-all group"
    >
      {/* Icon */}
      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/15 flex items-center justify-center">
        <CategoryIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
      </div>

      {/* Symbol and name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.symbol}</p>
        <p className="text-[11px] text-slate-500 truncate">{item.name}</p>
      </div>

      {/* Mock price data */}
      {mockData && (
        <div className="hidden sm:block text-right flex-shrink-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{mockData.price}</p>
          <p className={`text-[11px] font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositive ? '+' : ''}{mockData.change}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => toggleFavorite(watchlistId, item.id)}
          className={`p-1 rounded-lg transition-colors ${item.isFavorite ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400'}`}
          aria-label="Toggle favorite"
        >
          <Star className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-amber-500 dark:fill-amber-400' : ''}`} />
        </button>
        <button
          onClick={() => removeItem(watchlistId, item.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors"
          aria-label="Remove from watchlist"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
