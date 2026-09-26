import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Transient toasts (ephemeral, bottom-right)
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

// Persistent in-app notifications (notification panel)
export interface AppNotification {
  id: string;
  type: 'alert' | 'insight' | 'system' | 'report' | 'billing';
  title: string;
  body: string;
  isRead: boolean;
  href?: string;
  createdAt: string;
}

interface NotificationState {
  // Transient toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;

  // Persistent notifications
  notifications: AppNotification[];
  unreadCount: number;
  isPanelOpen: boolean;
  addNotification: (n: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-01',
    type: 'insight',
    title: 'Capital Flow Anomaly Detected',
    body: 'Significant USD outflow pattern detected in Southeast Asia corridor.',
    isRead: false,
    href: '/flows',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'n-02',
    type: 'report',
    title: 'Weekly Macro Report Ready',
    body: 'Your scheduled weekly macroeconomic summary report is ready to view.',
    isRead: false,
    href: '/reports',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'n-03',
    type: 'alert',
    title: 'EUR/USD Threshold Breached',
    body: 'EUR/USD crossed your watchlist alert threshold of 1.0850.',
    isRead: true,
    href: '/watchlist',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'n-04',
    type: 'system',
    title: 'System Maintenance Scheduled',
    body: 'Scheduled maintenance on July 20 from 02:00–04:00 UTC.',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      toasts: [],
      notifications: SEED_NOTIFICATIONS,
      unreadCount: SEED_NOTIFICATIONS.filter((n) => !n.isRead).length,
      isPanelOpen: false,

      addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        const duration = toast.duration ?? 4000;
        if (duration > 0) {
          setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
          }, duration);
        }
      },

      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      clearAll: () => set({ toasts: [] }),

      addNotification: (n) =>
        set((state) => {
          const newNotif: AppNotification = {
            ...n,
            id: `n-${Date.now()}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          return {
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          };
        }),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, state.notifications.filter((n) => !n.isRead && n.id !== id).length),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        })),

      deleteNotification: (id) =>
        set((state) => {
          const removed = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: removed && !removed.isRead
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        }),

      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    }),
    {
      name: 'geocapx-notifications',
      partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount }),
    }
  )
);
