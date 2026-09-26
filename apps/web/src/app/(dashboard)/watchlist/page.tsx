'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import { WatchlistItemRow } from '../../../components/dashboard/watchlist-item';
import { useWatchlistStore } from '../../../lib/store/watchlistStore';
import {
  Plus, Trash2, Edit2, Search, SortAsc, SortDesc, X, Check
} from 'lucide-react';

const CATEGORIES = ['all', 'currency', 'equity', 'commodity', 'bond', 'crypto', 'index'] as const;

export default function WatchlistPage() {
  const {
    watchlists, activeWatchlistId, setActiveWatchlist,
    createWatchlist, deleteWatchlist, renameWatchlist,
    searchQuery, setSearchQuery, filterCategory, setFilterCategory,
    sortBy, setSortBy, sortDir, setSortDir,
    addItem,
  } = useWatchlistStore();

  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [isAddingItem, setIsAddingItem] = React.useState(false);
  const [newSymbol, setNewSymbol] = React.useState('');
  const [newItemName, setNewItemName] = React.useState('');

  const activeWatchlist = watchlists.find((wl) => wl.id === activeWatchlistId);

  const filteredItems = React.useMemo(() => {
    if (!activeWatchlist) return [];
    let items = [...activeWatchlist.items];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
    }
    if (filterCategory !== 'all') {
      items = items.filter((i) => i.category === filterCategory);
    }
    items.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return (new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()) * dir;
    });
    return items;
  }, [activeWatchlist, searchQuery, filterCategory, sortBy, sortDir]);

  const handleCreate = () => {
    if (newName.trim()) {
      createWatchlist(newName.trim());
      setNewName('');
      setIsCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameWatchlist(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleAddItem = () => {
    if (newSymbol.trim() && activeWatchlistId) {
      addItem(activeWatchlistId, {
        symbol: newSymbol.trim().toUpperCase(),
        name: newItemName.trim() || newSymbol.trim().toUpperCase(),
        category: 'currency',
        isFavorite: false,
      });
      setNewSymbol('');
      setNewItemName('');
      setIsAddingItem(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlists"
        description="Track and organize instruments across markets"
        actions={
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="h-3 w-3" /> New Watchlist
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar: Watchlist list */}
        <div className="lg:col-span-1 space-y-2">
          {/* Create new */}
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-1 overflow-hidden"
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }}
                  placeholder="Watchlist name..."
                  className="flex-1 px-3 py-2 rounded-lg border border-indigo-500/40 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 shadow-sm"
                />
                <button onClick={handleCreate} className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => setIsCreating(false)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X className="h-3.5 w-3.5" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {watchlists.map((wl) => (
            <div key={wl.id} className="group">
              {editingId === wl.id ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(wl.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 px-3 py-2 rounded-lg border border-indigo-500/40 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 shadow-sm"
                  />
                  <button onClick={() => handleRename(wl.id)} className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div
                  onClick={() => setActiveWatchlist(wl.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    activeWatchlistId === wl.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-semibold'
                      : 'border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: wl.color }} />
                  <span className="flex-1 text-sm font-medium truncate">{wl.name}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-600">{wl.items.length}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(wl.id); setEditName(wl.name); }} className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Edit2 className="h-3 w-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteWatchlist(wl.id); }} className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main: Watchlist items */}
        <div className="lg:col-span-3 space-y-4">
          {activeWatchlist ? (
            <>
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search symbols..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-slate-400 dark:focus:border-slate-700 shadow-sm dark:shadow-none"
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-700 capitalize shadow-sm dark:shadow-none"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm dark:shadow-none"
                >
                  {sortDir === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
                  Sort
                </button>
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {/* Add item form */}
              <AnimatePresence>
                {isAddingItem && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 overflow-hidden"
                  >
                    <input
                      autoFocus
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value)}
                      placeholder="Symbol (e.g. EUR/USD)"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 shadow-sm"
                    />
                    <input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Display name (optional)"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 shadow-sm"
                    />
                    <button onClick={handleAddItem} className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setIsAddingItem(false)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items list */}
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
                  <p className="text-sm text-slate-500 dark:text-slate-600">No instruments in this watchlist</p>
                  <button onClick={() => setIsAddingItem(true)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
                    + Add your first instrument
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <WatchlistItemRow key={item.id} item={item} watchlistId={activeWatchlist.id} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="text-sm text-slate-500">Select or create a watchlist</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
