'use client';

import React from 'react';
import { useAuthStore } from '../../../../lib/store/authStore';
import { useNotificationStore } from '../../../../lib/store/notificationStore';
import { apiClient } from '../../../../lib/api-client';
import { User, Save, Check, Image as ImageIcon, Camera } from 'lucide-react';

const AVATAR_PRESETS = [
  'bg-gradient-to-tr from-indigo-500 to-violet-500',
  'bg-gradient-to-tr from-cyan-500 to-blue-600',
  'bg-gradient-to-tr from-emerald-500 to-teal-600',
  'bg-gradient-to-tr from-rose-500 to-pink-600',
  'bg-gradient-to-tr from-amber-500 to-orange-600',
  'bg-gradient-to-tr from-purple-600 to-indigo-700',
];

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [form, setForm] = React.useState({
    firstName: user?.firstName || 'Geo',
    lastName: user?.lastName || 'Analyst',
    email: user?.email || 'analyst@geocapx.com',
    organization: user?.organization || 'GeoCap-X Research',
    title: user?.jobTitle || 'Quantitative Analyst',
    bio: user?.bio || 'Quantitative researcher specializing in long-horizon capital flow predictions.',
  });

  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState(false);
  const [selectedGradient, setSelectedGradient] = React.useState(AVATAR_PRESETS[0]);
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync with auth user on mount or change
  React.useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        organization: user.organization || prev.organization,
        title: user.jobTitle || prev.title,
        bio: user.bio || prev.bio,
      }));
    }
  }, [user]);

  const handleChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 1. Update client auth store immediately
      updateUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        organization: form.organization,
        jobTitle: form.title,
        bio: form.bio,
      });

      // 2. Sync with backend API
      try {
        await apiClient.put('/v1/profile', {
          firstName: form.firstName,
          lastName: form.lastName,
        });
      } catch (apiErr) {
        // Local fallback persists in authStore and localStorage
        console.warn('Backend sync failed, saved locally:', apiErr);
      }

      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your personal information has been saved successfully.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Save',
        message: err.message || 'Could not update profile preferences.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = `${(form.firstName[0] || 'G')}${(form.lastName[0] || 'X')}`.toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/50">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
          <User className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile Details</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage your identity, role title, and workspace bio</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="relative">
            <div className={`h-16 w-16 rounded-2xl ${selectedGradient} flex items-center justify-center text-xl font-bold text-white shadow-md`}>
              {initials}
            </div>
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Change Avatar Style"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{form.firstName} {form.lastName}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                {user?.role || 'Analyst'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{form.email}</p>
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Choose Avatar Theme Color
            </button>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">First Name</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={handleChange('firstName')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm dark:shadow-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Last Name</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={handleChange('lastName')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm dark:shadow-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={handleChange('email')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm dark:shadow-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Organization</label>
            <input
              type="text"
              value={form.organization}
              onChange={handleChange('organization')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm dark:shadow-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Job Title</label>
            <input
              type="text"
              value={form.title}
              onChange={handleChange('title')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm dark:shadow-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Professional Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={handleChange('bio')}
              placeholder="Brief professional background or quantitative specialization..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none shadow-sm dark:shadow-none"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800/50">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Avatar Color Picker Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Select Avatar Style</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Choose a vibrant signature gradient for your user profile</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {AVATAR_PRESETS.map((grad, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedGradient(grad)}
                  className={`h-16 rounded-xl ${grad} flex items-center justify-center text-white font-bold transition-all relative ${
                    selectedGradient === grad ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105' : 'hover:opacity-90'
                  }`}
                >
                  {initials}
                  {selectedGradient === grad && (
                    <div className="absolute top-1 right-1 p-0.5 rounded-full bg-white text-indigo-600">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Apply Style
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
