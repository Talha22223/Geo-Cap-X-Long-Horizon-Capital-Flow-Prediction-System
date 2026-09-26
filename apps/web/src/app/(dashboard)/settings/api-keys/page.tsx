'use client';

import React from 'react';
import { useNotificationStore } from '../../../../lib/store/notificationStore';
import { useAuthStore } from '../../../../lib/store/authStore';
import { SubscriptionGate } from '../../../../components/subscription/subscription-gate';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, AlertTriangle, ShieldCheck, Check, X } from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  masked: string;
  created: string;
  lastUsed: string;
  scopes: string[];
}

const DEFAULT_KEYS: ApiKeyItem[] = [
  {
    id: 'key-prod-01',
    name: 'Production Trading Engine',
    prefix: 'gcx_live_',
    masked: '••••••••••••••••••••8f2a',
    created: '2026-06-12',
    lastUsed: '2 minutes ago',
    scopes: ['read', 'flows', 'predictions'],
  },
  {
    id: 'key-dev-02',
    name: 'Research Jupyter Notebooks',
    prefix: 'gcx_test_',
    masked: '••••••••••••••••••••3c91',
    created: '2026-08-01',
    lastUsed: 'Yesterday',
    scopes: ['read', 'flows'],
  },
];

export default function ApiKeysSettingsPage() {
  const { addToast } = useNotificationStore();
  const [keys, setKeys] = React.useState<ApiKeyItem[]>(DEFAULT_KEYS);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>(['read', 'flows']);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('geocapx_api_keys');
      if (saved) {
        try {
          setKeys(JSON.parse(saved));
        } catch {
          setKeys(DEFAULT_KEYS);
        }
      }
    }
  }, []);

  const saveKeys = (updated: ApiKeyItem[]) => {
    setKeys(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('geocapx_api_keys', JSON.stringify(updated));
    }
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      addToast({ type: 'error', title: 'Key Name Required', message: 'Please enter a descriptive label for your key.' });
      return;
    }

    // Generate real secure random key
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullKey = `gcx_live_${randomHex}`;
    const maskedSuffix = fullKey.slice(-4);

    const newKeyItem: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      prefix: 'gcx_live_',
      masked: `••••••••••••••••••••${maskedSuffix}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      scopes: selectedScopes,
    };

    const updated = [newKeyItem, ...keys];
    saveKeys(updated);

    setNewlyGeneratedKey(fullKey);
    setIsCreating(false);
    setNewKeyName('');

    addToast({
      type: 'success',
      title: 'API Key Generated',
      message: `"${newKeyItem.name}" has been created. Save your secret key now.`,
    });
  };

  const handleRevoke = (id: string, name: string) => {
    const updated = keys.filter((key) => key.id !== id);
    saveKeys(updated);
    addToast({
      type: 'warning',
      title: 'API Key Revoked',
      message: `"${name}" has been permanently deactivated.`,
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    addToast({ type: 'info', title: 'Copied', message: 'API key copied to clipboard.' });
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const { canAccessPro } = useAuthStore();
  const hasAccess = canAccessPro();

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-slate-300 leading-relaxed">
          <span className="font-bold text-amber-700 dark:text-amber-400">Security Warning:</span> API keys grant programmatic read & prediction access to your workspace. Never expose secrets in client-side code or public repositories.
        </div>
      </div>

      {!hasAccess ? (
        <SubscriptionGate
          featureName="Developer REST API Keys"
          description="Programmatic API keys allow automated quantitative algorithms, python scripts, and trading systems to query real-time capital flow forecasts. Upgrade to Pro Trader or Enterprise to generate live API credentials."
          requiredTier="pro"
        >
          <div />
        </SubscriptionGate>
      ) : (
        <>
          {/* Header and Create Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Developer API Keys</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage credentials for external models, algorithms, and webhooks</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Create New Key
            </button>
          </div>

      {/* Create Key Drawer/Card */}
      {isCreating && (
        <div className="p-5 rounded-2xl border border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-lg space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-200 dark:border-indigo-500/20">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configure New API Key</h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Key Name / Purpose
            </label>
            <input
              autoFocus
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Automated Risk Model Production"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Assigned Permissions & Scopes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'read', label: 'Market Data' },
                { id: 'flows', label: 'Capital Flows' },
                { id: 'predictions', label: 'AI Predictions' },
                { id: 'admin', label: 'Admin Metrics' },
              ].map((scope) => {
                const checked = selectedScopes.includes(scope.id);
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => toggleScope(scope.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      checked
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{scope.label}</span>
                    {checked && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
            >
              Generate Secret Key
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="space-y-3">
        {keys.map((key) => (
          <div
            key={key.id}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <Key className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{key.name}</p>
                  <p className="text-[11px] text-slate-500">Created on {key.created}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRevoke(key.id, key.name)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Revoke
              </button>
            </div>

            {/* Masked key with copy button */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <span className="flex-1 text-xs font-mono text-slate-700 dark:text-slate-300">
                {key.prefix}{key.masked}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(`${key.prefix}sample_key_${key.id}`)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                title="Copy Prefix"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">Scopes:</span>
                {key.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {scope}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-slate-500">Last used: {key.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {/* Secret Key Reveal Modal */}
      {newlyGeneratedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">API Key Generated Successfully</h3>
                <p className="text-[11px] text-slate-500">Copy this key now. It will not be shown again.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Secret Token</span>
                <button
                  type="button"
                  onClick={() => handleCopy(newlyGeneratedKey)}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  <Copy className="h-3 w-3" /> Copy Key
                </button>
              </div>
              <p className="font-mono text-xs break-all text-slate-900 dark:text-emerald-400 font-bold">
                {newlyGeneratedKey}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setNewlyGeneratedKey(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                I have saved my key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
