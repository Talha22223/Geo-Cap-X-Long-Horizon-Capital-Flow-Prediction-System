'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore } from '../../lib/store/themeStore';
import { useNotificationStore } from '../../lib/store/notificationStore';
import { useCommandStore } from '../../lib/store/commandStore';
import { useSidebarStore } from '../../lib/store/sidebarStore';
import { useAuthStore } from '../../lib/store/authStore';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { UserMenu } from './user-menu';

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  market: 'Market Overview',
  flows: 'Capital Flow',
  events: 'Intelligence Events',
  technical: 'Technical Analysis',
  predictions: 'AI Predictions',
  visualizations: 'Visualizations',
  reports: 'Saved Reports',
  watchlist: 'Watchlists',
  news: 'News',
  settings: 'Settings',
  profile: 'Profile',
  security: 'Security',
  appearance: 'Appearance',
  notifications: 'Notifications',
  sessions: 'Sessions',
  'api-keys': 'API Keys',
  billing: 'Billing',
  support: 'Support',
};

function useBreadcrumbs(): BreadcrumbSegment[] {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  return [
    { label: 'GeoCap-X', href: '/dashboard' },
    ...segments.map((seg, i) => ({
      label: ROUTE_LABELS[seg] ?? seg,
      href: i < segments.length - 1 ? `/${segments.slice(0, i + 1).join('/')}` : undefined,
    })),
  ];
}

export function TopNav() {
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount, togglePanel } = useNotificationStore();
  const { open: openCommand } = useCommandStore();
  const { toggleMobile } = useSidebarStore();
  const { user } = useAuthStore();
  const breadcrumbs = useBreadcrumbs();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommand();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCommand]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 dark:border-slate-800/50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl px-4 transition-colors duration-200">
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-xs text-slate-500 min-w-0 flex-1">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-400 dark:text-slate-600" />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-slate-900 dark:hover:text-slate-300 transition-colors truncate">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-slate-900 dark:text-slate-200 font-semibold truncate">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto flex-shrink-0">
        {/* Global search trigger */}
        <button
          onClick={openCommand}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 shadow-sm dark:shadow-none"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-500">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search */}
        <button
          onClick={openCommand}
          className="sm:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          onClick={togglePanel}
          className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-amber-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm dark:shadow-none"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
        </button>

        {/* User menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
