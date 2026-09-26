'use client';

import React from 'react';
import { useNotificationStore } from '../../../../lib/store/notificationStore';
import { Bell, Mail, Zap, FileText, CreditCard, Save, Radio, ShieldAlert, Check } from 'lucide-react';

const NOTIFICATION_GROUPS = [
  {
    label: 'Capital Flow Alerts',
    icon: Zap,
    items: [
      { key: 'flowThreshold', label: 'Flow Threshold Breaches', description: 'Real-time alert when a watchlist asset exceeds user-defined capital velocity threshold' },
      { key: 'flowAnomaly', label: 'AI Anomaly Detections', description: 'High-frequency institutional volume shifts flagged by the LSTM model' },
    ],
  },
  {
    label: 'Reports & Intelligence',
    icon: FileText,
    items: [
      { key: 'reportReady', label: 'Automated Briefings', description: 'Receive daily and weekly capital allocation executive digests' },
      { key: 'exportComplete', label: 'Export Completion', description: 'Notify when high-resolution CSV/JSON datasets are ready to download' },
    ],
  },
  {
    label: 'Billing & Account Security',
    icon: CreditCard,
    items: [
      { key: 'billingAlert', label: 'Stripe Billing & Renewal Alerts', description: 'Upcoming renewal reminders, invoice receipts, and plan changes' },
      { key: 'systemUpdates', label: 'Infrastructure & System Releases', description: 'Model weights re-training schedules and maintenance announcements' },
    ],
  },
];

export default function NotificationsSettingsPage() {
  const { addToast } = useNotificationStore();

  const [prefs, setPrefs] = React.useState<Record<string, boolean>>({
    flowThreshold: true,
    flowAnomaly: true,
    reportReady: true,
    exportComplete: true,
    billingAlert: true,
    systemUpdates: false,
  });

  const [channels, setChannels] = React.useState({
    inApp: true,
    email: true,
    browserPush: false,
  });

  // Load saved preferences
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPrefs = localStorage.getItem('geocapx_notif_prefs');
        if (savedPrefs) setPrefs(JSON.parse(savedPrefs));
        const savedChannels = localStorage.getItem('geocapx_notif_channels');
        if (savedChannels) setChannels(JSON.parse(savedChannels));
      } catch (err) {
        console.warn('Failed to parse notifications prefs:', err);
      }
    }
  }, []);

  const togglePref = (key: string) => {
    setPrefs((p) => {
      const updated = { ...p, [key]: !p[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('geocapx_notif_prefs', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const toggleChannel = (key: keyof typeof channels) => {
    setChannels((c) => {
      const updated = { ...c, [key]: !c[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('geocapx_notif_channels', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('geocapx_notif_prefs', JSON.stringify(prefs));
      localStorage.setItem('geocapx_notif_channels', JSON.stringify(channels));
    }
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      message: 'Your notification channels and alert triggers have been persisted.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Channels Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/50 mb-5">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Delivery Channels</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose where you receive real-time intelligence dispatches</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { key: 'inApp' as const, label: 'In-App Alerts', desc: 'Real-time floating badges and top navigation bell alerts', icon: Bell },
            { key: 'email' as const, label: 'Email Notifications', desc: 'Priority email dispatches sent to your primary address', icon: Mail },
            { key: 'browserPush' as const, label: 'Browser Push Notifications', desc: 'Native desktop banner notifications while running', icon: Radio },
          ].map((ch) => {
            const isEnabled = channels[ch.key];
            return (
              <div
                key={ch.key}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    <ch.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ch.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ch.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleChannel(ch.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Groups */}
      {NOTIFICATION_GROUPS.map((group) => (
        <div key={group.label} className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/40">
            <group.icon className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{group.label}</h2>
          </div>
          <div className="space-y-4">
            {group.items.map((item) => {
              const isEnabled = prefs[item.key] ?? false;
              return (
                <div key={item.key} className="flex items-center justify-between py-1">
                  <div className="pr-4">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref(item.key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-95"
        >
          <Save className="h-4 w-4" /> Save Preferences
        </button>
      </div>
    </div>
  );
}
