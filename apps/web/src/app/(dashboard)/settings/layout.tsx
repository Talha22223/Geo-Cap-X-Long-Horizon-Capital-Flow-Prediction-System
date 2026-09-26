'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Shield, Palette, Bell, Monitor, Key, ChevronRight, CreditCard } from 'lucide-react';

const SETTINGS_NAV = [
  { label: 'Profile', href: '/settings/profile', icon: User },
  { label: 'Billing & Plans', href: '/settings/billing', icon: CreditCard },
  { label: 'Security', href: '/settings/security', icon: Shield },
  { label: 'Appearance', href: '/settings/appearance', icon: Palette },
  { label: 'Notifications', href: '/settings/notifications', icon: Bell },
  { label: 'Sessions', href: '/settings/sessions', icon: Monitor },
  { label: 'API Keys', href: '/settings/api-keys', icon: Key },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences, security, and billing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Settings sidebar nav */}
        <nav className="lg:col-span-1">
          <ul className="space-y-1">
            {SETTINGS_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings content */}
        <div className="lg:col-span-3">
          {children}
        </div>
      </div>
    </div>
  );
}
