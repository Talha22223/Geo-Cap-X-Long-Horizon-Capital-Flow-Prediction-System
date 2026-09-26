import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedAnalysis {
  id: string;
  title: string;
  description?: string;
  type: 'capital-flow' | 'technical' | 'event-chain' | 'prediction' | 'custom';
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  href: string;
  section: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  type: 'view' | 'export' | 'save' | 'share' | 'create' | 'delete';
  title: string;
  description?: string;
  href?: string;
  timestamp: string;
}

export interface Draft {
  id: string;
  title: string;
  type: SavedAnalysis['type'];
  content?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceState {
  savedAnalyses: SavedAnalysis[];
  bookmarks: Bookmark[];
  recentActivity: ActivityEntry[];
  drafts: Draft[];

  // Saved Analyses
  pinAnalysis: (id: string) => void;
  deleteAnalysis: (id: string) => void;
  addAnalysis: (analysis: Omit<SavedAnalysis, 'id' | 'createdAt' | 'updatedAt'>) => void;

  // Bookmarks
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;

  // Activity
  logActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;

  // Drafts
  saveDraft: (draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteDraft: (id: string) => void;
}

const SEED_ANALYSES: SavedAnalysis[] = [
  {
    id: 'sa-01',
    title: 'USD Outflow Q1 2025 Attribution',
    description: 'SHAP-based attribution of USD capital outflows during Q1 2025',
    type: 'capital-flow',
    tags: ['USD', 'outflow', 'Q1-2025'],
    isPinned: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'sa-02',
    title: 'EUR/USD 6-Month Capital Flow Prediction',
    description: 'Long-horizon LSTM prediction for EUR/USD capital flows',
    type: 'prediction',
    tags: ['EUR', 'USD', 'prediction'],
    isPinned: false,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const SEED_ACTIVITY: ActivityEntry[] = [
  { id: 'a-01', type: 'view', title: 'Viewed Market Overview', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a-02', type: 'save', title: 'Saved USD Outflow Analysis', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'a-03', type: 'export', title: 'Exported Q1 Capital Flow Report', description: 'PDF export', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'a-04', type: 'view', title: 'Viewed EUR/USD Event Chain', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      savedAnalyses: SEED_ANALYSES,
      bookmarks: [],
      recentActivity: SEED_ACTIVITY,
      drafts: [],

      pinAnalysis: (id) =>
        set((state) => ({
          savedAnalyses: state.savedAnalyses.map((a) =>
            a.id === id ? { ...a, isPinned: !a.isPinned } : a
          ),
        })),

      deleteAnalysis: (id) =>
        set((state) => ({
          savedAnalyses: state.savedAnalyses.filter((a) => a.id !== id),
        })),

      addAnalysis: (analysis) =>
        set((state) => ({
          savedAnalyses: [
            {
              ...analysis,
              id: `sa-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...state.savedAnalyses,
          ],
        })),

      addBookmark: (bookmark) =>
        set((state) => ({
          bookmarks: [
            { ...bookmark, id: `bm-${Date.now()}`, createdAt: new Date().toISOString() },
            ...state.bookmarks,
          ],
        })),

      removeBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),

      logActivity: (entry) =>
        set((state) => ({
          recentActivity: [
            { ...entry, id: `a-${Date.now()}`, timestamp: new Date().toISOString() },
            ...state.recentActivity,
          ].slice(0, 50),
        })),

      saveDraft: (draft) =>
        set((state) => ({
          drafts: [
            {
              ...draft,
              id: `dr-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...state.drafts,
          ],
        })),

      deleteDraft: (id) =>
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
        })),
    }),
    { name: 'geocapx-workspace' }
  )
);
