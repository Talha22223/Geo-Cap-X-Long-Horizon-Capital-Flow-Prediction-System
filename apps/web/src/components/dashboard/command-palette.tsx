'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandStore } from '../../lib/store/commandStore';
import {
  Search,
  X,
  LayoutDashboard,
  Globe,
  TrendingUp,
  Link2,
  BarChart2,
  Brain,
  PieChart,
  FileText,
  Star,
  Newspaper,
  Settings,
  CreditCard,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
  category: string;
  keywords: string[];
}

const ALL_COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Go to home dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'Navigation', keywords: ['home', 'overview'] },
  { id: 'market', label: 'Market Overview', description: 'Global market summary', href: '/market', icon: Globe, category: 'Navigation', keywords: ['market', 'global'] },
  { id: 'flows', label: 'Capital Flow', description: 'Analyze capital flows', href: '/flows', icon: TrendingUp, category: 'Navigation', keywords: ['capital', 'flow', 'inflow', 'outflow'] },
  { id: 'events', label: 'Event Chains', description: 'Macroeconomic event analysis', href: '/events', icon: Link2, category: 'Navigation', keywords: ['events', 'chain', 'macro'] },
  { id: 'technical', label: 'Technical Analysis', description: 'Chart and indicator tools', href: '/technical', icon: BarChart2, category: 'Navigation', keywords: ['technical', 'chart', 'indicator'] },
  { id: 'predictions', label: 'AI Predictions', description: 'LSTM capital flow forecasts', href: '/predictions', icon: Brain, category: 'Navigation', keywords: ['ai', 'prediction', 'forecast', 'lstm'] },
  { id: 'visualizations', label: 'Visualizations', description: 'Interactive data visualizations', href: '/visualizations', icon: PieChart, category: 'Navigation', keywords: ['viz', 'chart', 'graph', 'map'] },
  { id: 'reports', label: 'Saved Reports', description: 'View and manage reports', href: '/reports', icon: FileText, category: 'Tools', keywords: ['report', 'export', 'pdf'] },
  { id: 'watchlist', label: 'Watchlists', description: 'Manage your watchlists', href: '/watchlist', icon: Star, category: 'Tools', keywords: ['watchlist', 'favorites', 'track'] },
  { id: 'news', label: 'News', description: 'Latest macro news', href: '/news', icon: Newspaper, category: 'Tools', keywords: ['news', 'headlines'] },
  { id: 'settings', label: 'Settings', description: 'Account and preferences', href: '/settings', icon: Settings, category: 'Account', keywords: ['settings', 'preferences', 'account'] },
  { id: 'settings-profile', label: 'Profile Settings', description: 'Edit your profile', href: '/settings/profile', icon: Settings, category: 'Account', keywords: ['profile', 'name', 'email'] },
  { id: 'settings-security', label: 'Security Settings', description: 'Password and 2FA', href: '/settings/security', icon: Settings, category: 'Account', keywords: ['security', 'password', '2fa'] },
  { id: 'billing', label: 'Billing', description: 'Manage subscription', href: '/billing', icon: CreditCard, category: 'Account', keywords: ['billing', 'plan', 'subscription'] },
  { id: 'support', label: 'Support', description: 'Get help', href: '/support', icon: HelpCircle, category: 'Account', keywords: ['help', 'support', 'contact'] },
];

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, query, close, setQuery, recentSearches, addRecentSearch, clearRecentSearches } = useCommandStore();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS.slice(0, 8);
    const q = query.toLowerCase();
    return ALL_COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  const handleSelect = (item: CommandItem) => {
    if (query.trim()) addRecentSearch(query.trim());
    close();
    router.push(item.href);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[selectedIndex]) { handleSelect(filtered[selectedIndex]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, selectedIndex]);

  let flatIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2"
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 overflow-hidden backdrop-blur-xl">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages, features, settings..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  id="command-palette-input"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {!query.trim() && recentSearches.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between px-4 py-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">Recent</p>
                      <button
                        onClick={clearRecentSearches}
                        className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-1">
                    <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                      {category}
                    </p>
                    {items.map((item) => {
                      const myIndex = flatIndex++;
                      const isSelected = myIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(myIndex)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-white'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            <item.icon className={`h-3.5 w-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`} />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold text-sm leading-none text-slate-900 dark:text-white">{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.description}</p>
                            )}
                          </div>
                          {isSelected && <ArrowRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50">
                <span><kbd className="font-mono text-slate-600 dark:text-slate-400">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono text-slate-600 dark:text-slate-400">↵</kbd> select</span>
                <span><kbd className="font-mono text-slate-600 dark:text-slate-400">ESC</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
