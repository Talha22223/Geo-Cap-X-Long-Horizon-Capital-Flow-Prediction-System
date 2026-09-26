'use client';

/**
 * ============================================================================
 * REACT CLIENT AUTHENTICATION & SUBSCRIPTION GUARD (AuthGuard)
 * ============================================================================
 * WHAT:
 *   Higher-order wrapper component for protected dashboard layouts:
 *   1. Triggers session verification on mount and on bfcache `pageshow`.
 *   2. Unauthenticated check: Redirects to `/login?redirect=<pathname>`.
 *   3. Unsubscribed check: Redirects unsubscribed users (status UNPAID) to `/plans`.
 *   4. Super Admin bypass: Permits administrators to view institutional pages without billing.
 *   5. Prevents UI flashing by rendering an institutional verification loader.
 *
 * WHY:
 *   Ensures users cannot view or interact with dashboard components before their
 *   session and active subscription status are validated by the server.
 * ============================================================================
 */

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../lib/store/authStore';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    isLoading,
    hasCheckedSession,
    subscription,
    user,
    initAuth,
    isSuperAdmin,
  } = useAuthStore();

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Handle bfcache (browser back/forward button after logout)
  React.useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        initAuth();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [initAuth]);

  // Route protection decision
  React.useEffect(() => {
    if (isLoading || !hasCheckedSession) return;

    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Authenticated user: check active subscription
    const isSuper = isSuperAdmin();
    const isSubActive = subscription?.isActive ?? (user?.subscriptionStatus === 'ACTIVE');

    if (!isSubActive && !isSuper) {
      router.replace('/plans');
    }
  }, [isAuthenticated, isLoading, hasCheckedSession, subscription, user, isSuperAdmin, router, pathname]);

  // Loading state: display high-end institutional verification screen
  if (isLoading || !hasCheckedSession) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white select-none">
        <div className="relative flex flex-col items-center p-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 shadow-2xl backdrop-blur-xl">
          <div className="relative mb-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
              <span className="font-black text-white text-2xl tracking-wider">X</span>
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
            </div>
          </div>

          <h2 className="text-base font-bold text-white tracking-tight">GeoCap-X Intelligence</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verifying institutional session & security keys...
          </p>

          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-6">
            <div className="w-full h-full bg-indigo-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Unsubscribed user (will be redirected by effect, prevent flash of content)
  const isSuper = isSuperAdmin();
  const isSubActive = subscription?.isActive ?? (user?.subscriptionStatus === 'ACTIVE');
  if (!isSubActive && !isSuper) {
    return null;
  }

  return <>{children}</>;
}
