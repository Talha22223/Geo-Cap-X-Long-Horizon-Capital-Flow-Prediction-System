'use client';

/**
 * ============================================================================
 * STRIPE CHECKOUT RETURN & VERIFICATION PAGE (subscription/success/page.tsx)
 * ============================================================================
 * WHAT:
 *   Handles browser redirect return from Stripe Hosted Checkout:
 *   1. Extracts `session_id` query parameter from URL.
 *   2. Calls `POST /api/v1/subscriptions/verify-session` to authorize and activate
 *      the subscription tier on the backend PostgreSQL database.
 *   3. Re-hydrates `useAuthStore` with the upgraded plan and ACTIVE status.
 *   4. Displays a success confirmation and directs the user to `/dashboard`.
 *
 * WHY:
 *   Ensures deterministic, synchronous activation of paid tiers immediately upon
 *   successful payment, complementing asynchronous Stripe webhooks.
 * ============================================================================
 */

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../lib/store/authStore';
import { useNotificationStore } from '../../../lib/store/notificationStore';
import { CheckCircle2, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, user, initAuth } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [isVerifying, setIsVerifying] = React.useState(true);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [planName, setPlanName] = React.useState<string>('Pro');

  const sessionId = searchParams.get('session_id');

  React.useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setErrorMessage('No Stripe checkout session ID found.');
        setIsVerifying(false);
        return;
      }

      try {
        await initAuth();
        const token = useAuthStore.getState().accessToken;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

        const res = await fetch(`${apiUrl}/v1/subscriptions/verify-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Unable to verify payment with Stripe.');
        }

        const confirmedPlan = data.plan || 'Pro';
        setPlanName(confirmedPlan);
        setIsSuccess(true);

        // Update local auth store state
        const currentUser = useAuthStore.getState().user;
        if (currentUser && token) {
          setAuth(
            {
              ...currentUser,
              plan: confirmedPlan.toLowerCase() as any,
              subscriptionStatus: 'ACTIVE',
            },
            token,
            {
              plan: confirmedPlan,
              status: 'ACTIVE',
              isActive: true,
              currentPeriodEnd: data.currentPeriodEnd,
            }
          );
        }

        addToast({
          type: 'success',
          title: 'Subscription Verified',
          message: `Your ${confirmedPlan} subscription is active!`,
        });

        // Automatically redirect to dashboard after 2.5 seconds
        setTimeout(() => {
          router.replace('/dashboard');
        }, 2500);
      } catch (err: any) {
        setErrorMessage(err.message || 'Payment verification encountered an unexpected issue.');
      } finally {
        setIsVerifying(false);
      }
    }

    verifyPayment();
  }, [sessionId, router, setAuth, initAuth, addToast]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl text-center">
        {isVerifying ? (
          <div className="py-8 space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Verifying Stripe Payment</h2>
            <p className="text-xs text-slate-400 font-mono">
              Confirming transaction with Stripe webhook authority & initializing access keys...
            </p>
          </div>
        ) : isSuccess ? (
          <div className="py-4 space-y-5 animate-in fade-in duration-300">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Checkout Completed!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your <span className="font-bold text-indigo-400">{planName} Tier</span> subscription has been activated in the database.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Subscription Status:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> ACTIVE
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Billing Provider:</span>
                <span className="font-semibold text-slate-200">Stripe (Test Mode)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Access Level:</span>
                <span className="font-semibold text-indigo-300 uppercase">{planName} Institutional</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.replace('/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
              >
                <span>Enter Protected Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-[10px] text-slate-500 mt-3 font-mono">Redirecting automatically...</p>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Verification Failed</h2>
              <p className="text-xs text-rose-300 mt-1">{errorMessage}</p>
            </div>

            <div className="flex gap-3 pt-3">
              <Link
                href="/plans"
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Back to Plans
              </Link>
              <Link
                href="/support"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500 font-mono">Loading payment status...</div>}>
      <SubscriptionSuccessContent />
    </React.Suspense>
  );
}
