'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeStore } from '../lib/store/themeStore';
import { useAuthStore } from '../lib/store/authStore';
import { useNotificationStore } from '../lib/store/notificationStore';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  const initTheme = useThemeStore((state) => state.initTheme);
  const theme = useThemeStore((state) => state.theme);
  const initAuth = useAuthStore((state) => state.initAuth);
  const { toasts, removeToast } = useNotificationStore();

  React.useEffect(() => {
    initTheme();
    initAuth();
  }, [initTheme, initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full">
        {toasts.map((toast) => {
          const iconMap = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
            error: <AlertCircle className="h-5 w-5 text-rose-500" />,
            info: <Info className="h-5 w-5 text-indigo-500" />,
          };

          const borderColors = {
            success: 'border-emerald-500/30',
            warning: 'border-amber-500/30',
            error: 'border-rose-500/30',
            info: 'border-indigo-500/30',
          };

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white shadow-xl transition-all duration-350 transform translate-y-0 animate-in slide-in-from-bottom-5 ${borderColors[toast.type]}`}
            >
              <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
              <div className="flex-1 space-y-0.5">
                {toast.title && <h4 className="font-semibold text-sm">{toast.title}</h4>}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </QueryClientProvider>
  );
}
