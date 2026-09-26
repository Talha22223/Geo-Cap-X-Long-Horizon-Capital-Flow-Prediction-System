'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import { ProvenanceModal } from '../../../components/dashboard/provenance-modal';
import { useExplainability } from '../../../lib/hooks/useExplainability';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import {
  Activity, Search, SlidersHorizontal, AlertCircle,
  ArrowUpDown, CalendarDays, ShieldAlert, CheckCircle2,
  TrendingUp, TrendingDown, Minus, X, ExternalLink, RefreshCw,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ExtractedEvent {
  id: string;
  title: string;
  category: string;
  sentiment: string;
  severity: number;
  overall_confidence: number;
  source_provider: string;
  data_origin: string;
  source_url?: string;
  publication_timestamp?: string;
  created_at: string;
  countries?: string[];
  regions?: string[];
  sectors?: string[];
  summary?: string;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

function useExtractedEvents(page = 1, size = 50) {
  return useQuery({
    queryKey: ['events', 'list', page],
    queryFn: async () => {
      const body: any = await apiClient.get(`/v1/ai/events?page=${page}&size=${size}`);
      if (!body.success) throw new Error(body.message || 'Failed to load events');
      return body.data as { items: ExtractedEvent[]; total: number };
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}

// ─── Config ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  MONETARY_POLICY:  'geocap-badge geocap-badge-indigo',
  GEOPOLITICAL:     'geocap-badge geocap-badge-rose',
  TRADE:            'geocap-badge geocap-badge-amber',
  ECONOMIC:         'geocap-badge geocap-badge-slate',
  CORPORATE:        'geocap-badge geocap-badge-emerald',
  POLITICAL:        'geocap-badge geocap-badge-rose',
  FISCAL:           'geocap-badge geocap-badge-amber',
};

const SENTIMENT_ICONS: Record<string, React.ElementType> = {
  BULLISH: TrendingUp,
  BEARISH: TrendingDown,
  NEUTRAL: Minus,
};

const SENTIMENT_COLORS: Record<string, string> = {
  BULLISH: 'text-emerald-400',
  BEARISH: 'text-rose-400',
  NEUTRAL: 'text-slate-400',
};

function severityLabel(s: number): { label: string; cls: string } {
  if (s >= 0.8) return { label: 'Critical', cls: 'text-rose-400' };
  if (s >= 0.6) return { label: 'High',     cls: 'text-amber-400' };
  if (s >= 0.4) return { label: 'Medium',   cls: 'text-indigo-400' };
  return                { label: 'Low',     cls: 'text-slate-400' };
}

// ─── EventCard ─────────────────────────────────────────────────────────────

function EventCard({ event, onInspect }: { event: ExtractedEvent; onInspect: (id: string) => void }) {
  const catCls = CATEGORY_COLORS[event.category] ?? 'geocap-badge geocap-badge-slate';
  const SentimentIcon = SENTIMENT_ICONS[event.sentiment] ?? Minus;
  const sentCls = SENTIMENT_COLORS[event.sentiment] ?? 'text-slate-400';
  const sev = severityLabel(event.severity ?? 0);
  const conf = Math.round((event.overall_confidence ?? 0) * 100);
  const ts = event.publication_timestamp || event.created_at;
  const dateStr = ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const timeStr = ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC' : '';

  return (
    <motion.div
      layout
      className="geocap-card p-5 space-y-3 group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={catCls}>{event.category.replace(/_/g, ' ')}</span>
            {event.data_origin && (
              <span className="geocap-badge geocap-badge-slate">{event.data_origin}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
            {event.title}
          </h3>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <SentimentIcon className={`h-4 w-4 ${sentCls}`} />
          <span className={`text-[10px] font-bold ${sentCls}`}>{event.sentiment}</span>
        </div>
      </div>

      {/* Summary */}
      {event.summary && (
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{event.summary}</p>
      )}

      {/* Meta row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] py-2 border-y border-slate-100 dark:border-slate-800/40">
        <div>
          <span className="text-slate-500 dark:text-slate-600">Severity</span>{' '}
          <span className={`font-bold ${sev.cls}`}>{sev.label}</span>
          {' '}
          <span className="text-slate-500 dark:text-slate-600 font-mono">({(event.severity ?? 0).toFixed(2)})</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-600">Confidence</span>{' '}
          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{conf}%</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-600">
          <CalendarDays className="h-2.5 w-2.5" />
          <span>{dateStr}</span>
          {timeStr && <span className="text-slate-400 dark:text-slate-700">{timeStr}</span>}
        </div>
        <div className="truncate text-slate-500 dark:text-slate-500 font-mono">
          {event.source_provider || event.data_origin || 'Unknown source'}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="geocap-conf-bar-track">
        <div className="geocap-conf-bar-fill" style={{ width: `${conf}%` }} />
      </div>

      {/* Entities */}
      {((event.countries?.length ?? 0) > 0 || (event.sectors?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1">
          {event.countries?.slice(0, 3).map(c => (
            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 border border-slate-200/80 dark:border-transparent font-mono">{c}</span>
          ))}
          {event.sectors?.slice(0, 2).map(s => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-transparent font-mono">{s}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-700 truncate" title={event.id}>
          ID: {event.id.slice(0, 8)}…
        </span>
        <div className="flex items-center gap-2">
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              aria-label="View original source"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            onClick={() => onInspect(event.id)}
            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Inspect provenance →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 space-y-3">
      <div className="flex gap-2 mb-2">
        <div className="h-4 w-20 geocap-skeleton" />
        <div className="h-4 w-14 geocap-skeleton" />
      </div>
      <div className="h-4 w-full geocap-skeleton" />
      <div className="h-3 w-3/4 geocap-skeleton" />
      <div className="grid grid-cols-2 gap-2 py-2">
        <div className="h-3 geocap-skeleton" />
        <div className="h-3 geocap-skeleton" />
        <div className="h-3 geocap-skeleton" />
        <div className="h-3 geocap-skeleton" />
      </div>
      <div className="h-1 geocap-skeleton" />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'MONETARY_POLICY', 'GEOPOLITICAL', 'TRADE', 'ECONOMIC', 'CORPORATE', 'POLITICAL', 'FISCAL'];
const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
const SORT_OPTIONS = [
  { id: 'date_desc',   label: 'Date (newest)' },
  { id: 'confidence',  label: 'Confidence ↓' },
  { id: 'severity',    label: 'Severity ↓' },
];

export default function EventsPage() {
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');
  const [severity, setSeverity]       = useState('All');
  const [sortBy, setSortBy]           = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [provenanceId, setProvenanceId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useExtractedEvents();
  const { getEventExplanation, explanation, loading: explainLoading } = useExplainability();

  const handleInspect = useCallback(async (id: string) => {
    setProvenanceId(id);
    await getEventExplanation(id);
  }, [getEventExplanation]);

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .filter(ev => {
        if (search && !ev.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (category !== 'All' && ev.category !== category) return false;
        if (severity !== 'All') {
          const s = ev.severity ?? 0;
          if (severity === 'Critical' && s < 0.8) return false;
          if (severity === 'High'     && (s < 0.6 || s >= 0.8)) return false;
          if (severity === 'Medium'   && (s < 0.4 || s >= 0.6)) return false;
          if (severity === 'Low'      && s >= 0.4) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'confidence') return (b.overall_confidence ?? 0) - (a.overall_confidence ?? 0);
        if (sortBy === 'severity')   return (b.severity ?? 0) - (a.severity ?? 0);
        const ta = new Date(a.publication_timestamp || a.created_at).getTime();
        const tb = new Date(b.publication_timestamp || b.created_at).getTime();
        return tb - ta;
      });
  }, [data, search, category, severity, sortBy]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligence Events"
        description="Normalized geopolitical and macroeconomic events extracted from ingested source data"
        badge="V9.1 Pipeline"
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        }
      />

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search intelligence events"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 shadow-sm dark:shadow-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              aria-label="Sort events"
              className="pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500/50 shadow-sm dark:shadow-none transition-all appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            aria-expanded={showFilters}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shadow-sm dark:shadow-none transition-all ${
              showFilters
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </button>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/60 bg-white dark:bg-slate-900/30 shadow-sm dark:shadow-none space-y-4">
                {/* Category */}
                <div>
                  <label className="geocap-section-label block mb-2">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        aria-pressed={category === c}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          category === c
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                        }`}
                      >
                        {c === 'All' ? 'All Categories' : c.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Severity */}
                <div>
                  <label className="geocap-section-label block mb-2">Severity</label>
                  <div className="flex gap-1.5">
                    {SEVERITIES.map(s => (
                      <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        aria-pressed={severity === s}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          severity === s
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter summary */}
        {(category !== 'All' || severity !== 'All' || search) && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              Showing <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{data?.items?.length ?? 0}</span> events
            </span>
            <button
              onClick={() => { setSearch(''); setCategory('All'); setSeverity('All'); }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(null).map((_, i) => <EventCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <div className="flex items-start gap-3 p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
          <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Failed to load intelligence events</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              The AI service may be unavailable or the ingestion pipeline has not yet run.
              Ensure the FastAPI service is running and the database is accessible.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20">
          <div className="geocap-empty-state">
            {data?.items?.length === 0 ? (
              <>
                <ShieldAlert className="geocap-empty-state-icon" />
                <p className="geocap-empty-title">No events extracted yet</p>
                <p className="geocap-empty-body">
                  The ingestion pipeline has not yet processed any source data.
                  Run the pipeline from the AI service to extract intelligence events.
                </p>
              </>
            ) : (
              <>
                <Search className="geocap-empty-state-icon" />
                <p className="geocap-empty-title">No events match your filters</p>
                <p className="geocap-empty-body">
                  Try adjusting your search query, category, or severity filter.
                </p>
                <button
                  onClick={() => { setSearch(''); setCategory('All'); setSeverity('All'); }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-colors"
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <EventCard event={ev} onInspect={handleInspect} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Provenance Drawer */}
      <ProvenanceModal
        isOpen={!!provenanceId}
        onClose={() => setProvenanceId(null)}
        explanation={explanation}
        loading={explainLoading}
      />
    </div>
  );
}
