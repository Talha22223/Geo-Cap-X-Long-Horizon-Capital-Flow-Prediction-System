'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebarStore } from '../../lib/store/sidebarStore';
import { useAuthStore } from '../../lib/store/authStore';
import { useNotificationStore } from '../../lib/store/notificationStore';
import {
  LayoutDashboard, Globe, TrendingUp, Link2, BarChart2, Brain,
  PieChart, FileText, Star, Newspaper, Settings, CreditCard,
  HelpCircle, X, Zap, LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Market Overview', href: '/market', icon: Globe },
  { name: 'Capital Flow', href: '/flows', icon: TrendingUp },
  { name: 'Event Chains', href: '/events', icon: Link2 },
  { name: 'Technical Analysis', href: '/technical', icon: BarChart2 },
  { name: 'AI Predictions', href: '/predictions', icon: Brain },
  { name: 'Visualizations', href: '/visualizations', icon: PieChart },
  { name: 'Saved Reports', href: '/reports', icon: FileText },
  { name: 'Watchlists', href: '/watchlist', icon: Star },
  { name: 'News', href: '/news', icon: Newspaper },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Billing', href: '/settings/billing', icon: CreditCard },
  { name: 'Support', href: '/support', icon: HelpCircle },
];

export function MobileSidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebarStore();
  const { logout } = useAuthStore();
  const { addToast } = useNotificationStore();
  const pathname = usePathname();

  const handleLogout = async () => {
    setMobileOpen(false);
    addToast({ type: 'info', title: 'Signing out', message: 'Closing your secure session...' });
    await logout();
  };


  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <AnimatePresence>
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex flex-col w-72 h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">GeoCap-X</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <ul className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        prefetch={true}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800/50">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
