import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SearchResult {
  id: string;
  type: 'page' | 'report' | 'watchlist' | 'action' | 'setting';
  title: string;
  description?: string;
  href?: string;
  icon?: string;
  shortcut?: string;
}

interface CommandState {
  isOpen: boolean;
  query: string;
  recentSearches: string[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useCommandStore = create<CommandState>()(
  persist(
    (set) => ({
      isOpen: false,
      query: '',
      recentSearches: [],
      open: () => set({ isOpen: true, query: '' }),
      close: () => set({ isOpen: false, query: '' }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen, query: '' })),
      setQuery: (query) => set({ query }),
      addRecentSearch: (query) =>
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter((s) => s !== query),
          ].slice(0, 8),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'geocapx-command',
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    }
  )
);
