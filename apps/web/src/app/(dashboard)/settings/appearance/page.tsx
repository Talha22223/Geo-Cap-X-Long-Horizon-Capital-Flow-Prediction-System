'use client';

import React from 'react';
import { useThemeStore, type ThemeMode, type AccentColor, type LayoutDensity } from '../../../../lib/store/themeStore';
import { useNotificationStore } from '../../../../lib/store/notificationStore';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';

const THEMES: { value: ThemeMode; label: string; icon: typeof Moon; description: string }[] = [
  { value: 'dark', label: 'Dark Mode', icon: Moon, description: 'Deep dark oceanic theme for focused analysis' },
  { value: 'light', label: 'Light Mode', icon: Sun, description: 'Clean, high-contrast bright theme for daylight reading' },
];

const ACCENT_COLORS: { id: AccentColor; name: string; bgClass: string; ringColor: string }[] = [
  { id: 'indigo', name: 'Indigo', bgClass: 'bg-indigo-500', ringColor: 'ring-indigo-500' },
  { id: 'violet', name: 'Violet', bgClass: 'bg-violet-500', ringColor: 'ring-violet-500' },
  { id: 'cyan', name: 'Cyan', bgClass: 'bg-cyan-500', ringColor: 'ring-cyan-500' },
  { id: 'emerald', name: 'Emerald', bgClass: 'bg-emerald-500', ringColor: 'ring-emerald-500' },
  { id: 'rose', name: 'Rose', bgClass: 'bg-rose-500', ringColor: 'ring-rose-500' },
];

const DENSITIES: { value: LayoutDensity; label: string; description: string }[] = [
  { value: 'comfortable', label: 'Comfortable', description: 'Standard padding and relaxed spacing across widgets' },
  { value: 'compact', label: 'Compact', description: 'Condensed spacing for maximum financial data density' },
];

export default function AppearanceSettingsPage() {
  const { theme, setTheme, accent, setAccent, density, setDensity } = useThemeStore();
  const { addToast } = useNotificationStore();

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      message: `Theme set to ${theme.toUpperCase()}, accent to ${accent}, and layout to ${density}.`,
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/50 mb-6">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Appearance & Workspace</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Customize the visual presentation, color accents, and layout density</p>
          </div>
        </div>

        {/* Theme mode selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Theme Mode
            </p>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Active: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {THEMES.map((t) => {
              const isSelected = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-2 rounded-lg ${
                      isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {t.label}
                      </p>
                      {isSelected && <Check className="h-4 w-4 text-indigo-500" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color */}
        <div className="mb-8">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
            Brand Accent Color
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_COLORS.map((color) => {
              const isSelected = accent === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setAccent(color.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full ${color.bgClass} shadow-sm`} />
                  <span className="text-xs text-slate-800 dark:text-slate-200 capitalize font-medium">{color.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Layout Density */}
        <div className="mb-8">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
            Data Layout Density
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DENSITIES.map((d) => {
              const isSelected = density === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDensity(d.value)}
                  className={`flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Monitor className={`h-4 w-4 mt-0.5 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {d.label}
                      </p>
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {d.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer save */}
        <div className="flex justify-end pt-5 border-t border-slate-200 dark:border-slate-800/50">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
