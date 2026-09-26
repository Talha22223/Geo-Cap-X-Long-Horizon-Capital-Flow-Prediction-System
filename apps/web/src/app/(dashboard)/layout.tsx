'use client';

import React from 'react';
import { Sidebar } from '../../components/dashboard/sidebar';
import { TopNav } from '../../components/dashboard/top-nav';
import { MobileSidebar } from '../../components/dashboard/mobile-sidebar';
import { CommandPalette } from '../../components/dashboard/command-palette';
import { NotificationPanel } from '../../components/dashboard/notification-panel';
import { AuthGuard } from '../../components/auth/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar />

        {/* Command Palette Portal */}
        <CommandPalette />

        {/* Notification Slide Panel */}
        <NotificationPanel />

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Sticky Top Navigation */}
          <TopNav />

          {/* Scrollable page viewport */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-5 md:p-6 max-w-screen-2xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
