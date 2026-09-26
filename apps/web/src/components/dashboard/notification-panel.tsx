'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type AppNotification } from '../../lib/store/notificationStore';
import {
  X,
  Bell,
  BellOff,
  CheckCheck,
  Zap,
  FileText,
  AlertTriangle,
  Info,
  CreditCard,
  ExternalLink,
  Trash2,
} from 'lucide-react';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_CONFIG: Record<AppNotification['type'], { icon: React.ElementType; color: string; bg: string }> = {
  alert: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  insight: { icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  system: { icon: Info, color: 'text-slate-400', bg: 'bg-slate-700/50' },
  report: { icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  billing: { icon: CreditCard, color: 'text-violet-400', bg: 'bg-violet-500/10' },
};

export function NotificationPanel() {
  const { isPanelOpen, closePanel, notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotificationStore();

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={closePanel}
          />
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800/60 shadow-2xl transition-colors duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800/50">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Mark all read"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <BellOff className="h-5 w-5 text-slate-400 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {notifications.map((notif) => {
                    const cfg = TYPE_CONFIG[notif.type];
                    const IconComponent = cfg.icon;
                    return (
                      <li
                        key={notif.id}
                        className={`relative group px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40 ${!notif.isRead ? 'bg-indigo-50/40 dark:bg-slate-900/20' : ''}`}
                        onClick={() => !notif.isRead && markRead(notif.id)}
                      >
                        {!notif.isRead && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                            <IconComponent className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${notif.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white font-semibold'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.body}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-600">{timeAgo(notif.createdAt)}</span>
                              {notif.href && (
                                <Link
                                  href={notif.href}
                                  onClick={closePanel}
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                >
                                  View <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 transition-all"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30">
              <Link
                href="/settings/notifications"
                onClick={closePanel}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-300 transition-colors"
              >
                Notification settings →
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
