'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Globe, LogOut, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNotificationStore } from '../../../../lib/store/notificationStore';

interface SessionItem {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const DEFAULT_SESSIONS: SessionItem[] = [
  {
    id: 'sess-current',
    device: 'Desktop Workstation',
    browser: 'Chrome 128 (Windows 11)',
    ipAddress: '192.168.1.104',
    location: 'Current Device',
    lastActive: 'Active Now',
    isCurrent: true,
  },
  {
    id: 'sess-02',
    device: 'iPhone 15 Pro Max',
    browser: 'Safari Mobile 18.1',
    ipAddress: '175.140.22.81',
    location: 'Singapore, SG',
    lastActive: '14 minutes ago',
    isCurrent: false,
  },
  {
    id: 'sess-03',
    device: 'MacBook Pro M3 Max',
    browser: 'Arc Browser 1.5',
    ipAddress: '103.24.110.12',
    location: 'London, UK',
    lastActive: '2 days ago',
    isCurrent: false,
  },
];

export default function SessionsSettingsPage() {
  const { addToast } = useNotificationStore();
  const [sessions, setSessions] = React.useState<SessionItem[]>(DEFAULT_SESSIONS);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('geocapx_sessions');
      if (saved) {
        try {
          setSessions(JSON.parse(saved));
        } catch {
          setSessions(DEFAULT_SESSIONS);
        }
      }
    }
  }, []);

  const saveSessions = (updated: SessionItem[]) => {
    setSessions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('geocapx_sessions', JSON.stringify(updated));
    }
  };

  const revokeSession = (id: string, device: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    addToast({
      type: 'info',
      title: 'Device Terminated',
      message: `${device} session has been revoked and signed out.`,
    });
  };

  const revokeAllOther = () => {
    const updated = sessions.filter((s) => s.isCurrent);
    saveSessions(updated);
    addToast({
      type: 'warning',
      title: 'All Other Sessions Signed Out',
      message: 'All remote active login sessions have been invalidated.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Login Sessions</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage connected devices and revoke unauthorized browser sessions</p>
        </div>
        {sessions.length > 1 && (
          <button
            type="button"
            onClick={revokeAllOther}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
          >
            Sign out all other devices
          </button>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border transition-all ${
              session.isCurrent
                ? 'border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div
                className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${
                  session.isCurrent
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {session.device.includes('iPhone') || session.device.includes('Android') ? (
                  <Smartphone className="h-5 w-5" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{session.device}</p>
                  {session.isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Current Device
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">IP: {session.ipAddress}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{session.browser}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {session.location}
                  </span>
                  <span>•</span>
                  <span className={session.isCurrent ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                    {session.lastActive}
                  </span>
                </div>
              </div>
            </div>

            {!session.isCurrent && (
              <div className="self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => revokeSession(session.id, session.device)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" /> Revoke Access
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
