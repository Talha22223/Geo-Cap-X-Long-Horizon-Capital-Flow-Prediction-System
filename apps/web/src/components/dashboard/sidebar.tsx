'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebarStore } from '../../lib/store/sidebarStore';
import { useAuthStore } from '../../lib/store/authStore';
import {
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
  ChevronLeft,
  ChevronRight,
  Zap,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Market Overview', href: '/market', icon: Globe },
      { name: 'Capital Flow', href: '/flows', icon: TrendingUp },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { name: 'Intelligence Events', href: '/events', icon: Link2 },
      { name: 'Technical Analysis', href: '/technical', icon: BarChart2 },
      { name: 'AI Predictions', href: '/predictions', icon: Brain },
      { name: 'Visualizations', href: '/visualizations', icon: PieChart },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'Saved Reports', href: '/reports', icon: FileText },
      { name: 'Watchlists', href: '/watchlist', icon: Star },
      { name: 'News', href: '/news', icon: Newspaper },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Billing', href: '/settings/billing', icon: CreditCard },
      { name: 'Support', href: '/support', icon: HelpCircle },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useSidebarStore();
  const { user, isSuperAdmin } = useAuthStore();
  const isAdmin = isSuperAdmin();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-slate-200/80 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl overflow-hidden z-30 transition-colors duration-200"
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800/40 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  GeoCap-X
                </span>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Admin
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={toggleCollapse}
          className="flex-shrink-0 p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      prefetch={true}
                      title={isCollapsed ? item.name : undefined}
                      aria-label={item.name}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        active
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
                      )}
                      <item.icon className={`flex-shrink-0 h-4 w-4 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.15 }}
                            className="whitespace-nowrap"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Super Admin section if user is super admin */}
        {isAdmin && (
          <div className="mb-4">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400"
                >
                  Administration
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5 px-2">
              <li>
                <Link
                  href="/admin"
                  prefetch={true}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20`}
                >
                  <ShieldCheck className="flex-shrink-0 h-4 w-4 text-amber-500" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        className="whitespace-nowrap font-medium"
                      >
                        Admin Control
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-2 border-t border-slate-200/80 dark:border-slate-800/40">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-2 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-200/60 dark:border-indigo-500/10"
            >
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">GEOCAP-X Intelligence</p>
              <p className="text-[10px] text-slate-500 mt-0.5">V9.2 · Research Build</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
