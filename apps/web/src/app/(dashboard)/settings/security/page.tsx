'use client';

import React from 'react';
import { useNotificationStore } from '../../../../lib/store/notificationStore';
import { Shield, Lock, Smartphone, Key, Eye, EyeOff, Check, AlertTriangle, QrCode, X, Clock } from 'lucide-react';

export default function SecuritySettingsPage() {
  const { addToast } = useNotificationStore();
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pwForm, setPwForm] = React.useState({ current: '', newPw: '', confirm: '' });
  const [isUpdatingPw, setIsUpdatingPw] = React.useState(false);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = React.useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = React.useState(false);
  const [mfaCode, setMfaCode] = React.useState('');
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);

  // Session timeout setting
  const [sessionTimeout, setSessionTimeout] = React.useState('30m');

  // Load saved preferences
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved2FA = localStorage.getItem('geocapx_2fa') === 'true';
      setTwoFAEnabled(saved2FA);
      const savedTimeout = localStorage.getItem('geocapx_timeout');
      if (savedTimeout) setSessionTimeout(savedTimeout);
    }
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pwForm.current) {
      addToast({ type: 'error', title: 'Current Password Required', message: 'Please enter your current account password.' });
      return;
    }

    if (pwForm.newPw.length < 8) {
      addToast({ type: 'error', title: 'Password Too Short', message: 'Password must be at least 8 characters in length.' });
      return;
    }

    if (pwForm.newPw !== pwForm.confirm) {
      addToast({ type: 'error', title: 'Passwords Do Not Match', message: 'Please ensure both new password fields match exactly.' });
      return;
    }

    setIsUpdatingPw(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    addToast({
      type: 'success',
      title: 'Password Updated',
      message: 'Your account password has been changed successfully.',
    });

    setPwForm({ current: '', newPw: '', confirm: '' });
    setIsUpdatingPw(false);
  };

  const handleToggle2FA = () => {
    if (twoFAEnabled) {
      // Disable
      setTwoFAEnabled(false);
      localStorage.setItem('geocapx_2fa', 'false');
      addToast({ type: 'warning', title: '2FA Disabled', message: 'Two-factor authentication has been turned off.' });
    } else {
      // Launch 2FA enrollment modal
      const codes = [
        'GCX-7821-4910',
        'GCX-3019-8824',
        'GCX-9402-1175',
        'GCX-5531-9043',
      ];
      setBackupCodes(codes);
      setMfaCode('');
      setIs2FAModalOpen(true);
    }
  };

  const handleVerifyAndEnable2FA = () => {
    if (mfaCode.length < 6) {
      addToast({ type: 'error', title: 'Invalid Code', message: 'Please enter a 6-digit verification code.' });
      return;
    }

    setTwoFAEnabled(true);
    localStorage.setItem('geocapx_2fa', 'true');
    setIs2FAModalOpen(false);
    addToast({
      type: 'success',
      title: '2FA Activated!',
      message: 'Two-factor authentication is now active on your account.',
    });
  };

  const handleTimeoutChange = (val: string) => {
    setSessionTimeout(val);
    localStorage.setItem('geocapx_timeout', val);
    addToast({
      type: 'info',
      title: 'Session Timeout Updated',
      message: `Inactivity auto-lock set to ${val === '15m' ? '15 Minutes' : val === '30m' ? '30 Minutes' : val === '1h' ? '1 Hour' : '8 Hours'}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/50 mb-5">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Change Account Password</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ensure your password contains uppercase, lowercase, and numbers</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={pwForm.current}
                onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                placeholder="Enter existing password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm dark:shadow-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={pwForm.newPw}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm dark:shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm dark:shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPw}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
            >
              {isUpdatingPw ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h2>
                {twoFAEnabled && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Require an authenticator app code (Google Authenticator / 1Password) on sign in</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggle2FA}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              twoFAEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                twoFAEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Session Inactivity Timeout */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Session Inactivity Lock</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Automatically sign out after a specified period of inactivity</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: '15m', label: '15 Minutes' },
            { id: '30m', label: '30 Minutes' },
            { id: '1h', label: '1 Hour' },
            { id: '8h', label: '8 Hours' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTimeoutChange(item.id)}
              className={`p-3 rounded-xl border text-center transition-all ${
                sessionTimeout === item.id
                  ? 'border-indigo-500 bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <p className="text-xs">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {is2FAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <QrCode className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enable Authenticator 2FA</h3>
              </div>
              <button
                type="button"
                onClick={() => setIs2FAModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Simulation */}
            <div className="flex flex-col items-center p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
              <div className="h-36 w-36 bg-white p-2.5 rounded-xl border border-slate-300 shadow-inner flex items-center justify-center">
                {/* SVG QR Code Pattern Mock */}
                <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-slate-900 rounded">
                  {Array.from({ length: 36 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-[1px] ${
                        idx % 2 === 0 || idx % 5 === 0 ? 'bg-white' : 'bg-indigo-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">Scan this code in your authenticator app</p>
              <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1 font-bold">
                Secret: JBSW-Y3DP-EHPK-3PXP
              </p>
            </div>

            {/* Verification code input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-xl font-mono tracking-widest px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            {/* Recovery Codes */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">Emergency Recovery Codes</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {backupCodes.map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIs2FAModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyAndEnable2FA}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
              >
                Verify & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
