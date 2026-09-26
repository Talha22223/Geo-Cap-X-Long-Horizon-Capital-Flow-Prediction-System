import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  category: 'currency' | 'equity' | 'commodity' | 'bond' | 'crypto' | 'index';
  isFavorite: boolean;
  addedAt: string;
  notes?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  color: string;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
}

interface WatchlistState {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  searchQuery: string;
  sortBy: 'name' | 'addedAt' | 'symbol';
  sortDir: 'asc' | 'desc';
  filterCategory: WatchlistItem['category'] | 'all';

  // Actions
  setActiveWatchlist: (id: string) => void;
  createWatchlist: (name: string, description?: string) => void;
  deleteWatchlist: (id: string) => void;
  renameWatchlist: (id: string, name: string) => void;
  addItem: (watchlistId: string, item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void;
  removeItem: (watchlistId: string, itemId: string) => void;
  toggleFavorite: (watchlistId: string, itemId: string) => void;
  setSearchQuery: (q: string) => void;
  setSortBy: (s: WatchlistState['sortBy']) => void;
  setSortDir: (d: WatchlistState['sortDir']) => void;
  setFilterCategory: (c: WatchlistState['filterCategory']) => void;
}

const DEFAULT_WATCHLISTS: Watchlist[] = [
  {
    id: 'wl-01',
    name: 'G10 FX Pairs',
    description: 'Major global currency pairs',
    color: '#6366f1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      { id: 'i-01', symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'currency', isFavorite: true, addedAt: new Date().toISOString() },
      { id: 'i-02', symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'currency', isFavorite: false, addedAt: new Date().toISOString() },
      { id: 'i-03', symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'currency', isFavorite: true, addedAt: new Date().toISOString() },
      { id: 'i-04', symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', category: 'currency', isFavorite: false, addedAt: new Date().toISOString() },
    ],
  },
  {
    id: 'wl-02',
    name: 'Macro Benchmarks',
    description: 'Key benchmark indices',
    color: '#8b5cf6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      { id: 'i-05', symbol: 'DXY', name: 'US Dollar Index', category: 'index', isFavorite: true, addedAt: new Date().toISOString() },
      { id: 'i-06', symbol: 'VIX', name: 'CBOE Volatility Index', category: 'index', isFavorite: false, addedAt: new Date().toISOString() },
      { id: 'i-07', symbol: 'US10Y', name: 'US 10-Year Treasury Yield', category: 'bond', isFavorite: true, addedAt: new Date().toISOString() },
    ],
  },
];

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      watchlists: DEFAULT_WATCHLISTS,
      activeWatchlistId: 'wl-01',
      searchQuery: '',
      sortBy: 'name',
      sortDir: 'asc',
      filterCategory: 'all',

      setActiveWatchlist: (id) => set({ activeWatchlistId: id }),

      createWatchlist: (name, description) =>
        set((state) => {
          const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
          const newWl: Watchlist = {
            id: `wl-${Date.now()}`,
            name,
            description,
            color: colors[state.watchlists.length % colors.length],
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return { watchlists: [...state.watchlists, newWl], activeWatchlistId: newWl.id };
        }),

      deleteWatchlist: (id) =>
        set((state) => ({
          watchlists: state.watchlists.filter((wl) => wl.id !== id),
          activeWatchlistId:
            state.activeWatchlistId === id
              ? state.watchlists.find((wl) => wl.id !== id)?.id ?? null
              : state.activeWatchlistId,
        })),

      renameWatchlist: (id, name) =>
        set((state) => ({
          watchlists: state.watchlists.map((wl) =>
            wl.id === id ? { ...wl, name, updatedAt: new Date().toISOString() } : wl
          ),
        })),

      addItem: (watchlistId, item) =>
        set((state) => ({
          watchlists: state.watchlists.map((wl) =>
            wl.id === watchlistId
              ? {
                  ...wl,
                  items: [
                    ...wl.items,
                    { ...item, id: `i-${Date.now()}`, addedAt: new Date().toISOString() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : wl
          ),
        })),

      removeItem: (watchlistId, itemId) =>
        set((state) => ({
          watchlists: state.watchlists.map((wl) =>
            wl.id === watchlistId
              ? { ...wl, items: wl.items.filter((i) => i.id !== itemId), updatedAt: new Date().toISOString() }
              : wl
          ),
        })),

      toggleFavorite: (watchlistId, itemId) =>
        set((state) => ({
          watchlists: state.watchlists.map((wl) =>
            wl.id === watchlistId
              ? {
                  ...wl,
                  items: wl.items.map((i) =>
                    i.id === itemId ? { ...i, isFavorite: !i.isFavorite } : i
                  ),
                }
              : wl
          ),
        })),

      setSearchQuery: (q) => set({ searchQuery: q }),
      setSortBy: (s) => set({ sortBy: s }),
      setSortDir: (d) => set({ sortDir: d }),
      setFilterCategory: (c) => set({ filterCategory: c }),
    }),
    { name: 'geocapx-watchlists' }
  )
);
