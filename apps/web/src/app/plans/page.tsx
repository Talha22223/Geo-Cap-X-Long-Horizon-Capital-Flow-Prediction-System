'use client';

/**
 * ============================================================================
 * SUBSCRIPTION PLANS & CHECKOUT PAGE (plans/page.tsx)
 * ============================================================================
 * WHAT:
 *   Pricing tiers selection and checkout launching interface:
 *   - Fetches active tiers from `GET /api/v1/subscriptions/plans`:
 *       1. Free Sandbox ($0/month): Basic 1M forecast & 5 predictions quota
 *       2. Pro Trader ($129/month): Multi-horizon (6M, 1Y), SNA graph, full feed
 *       3. Enterprise Quant ($499/month): 3Y/5Y horizons, leakage testing, custom API
 *   - Stripe Checkout: Calls `POST /api/v1/subscriptions/checkout-session` and redirects
 *     to Stripe hosted checkout.
 *   - Free Plan Activation: Calls `POST /api/v1/subscriptions/activate-free` for instant access.
 *
 * WHY:
 *   Compulsory onboarding step: New registrations are directed here to select a tier
 *   before receiving access to protected institutional intelligence features.
 * ============================================================================
 */

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../lib/store/authStore';
import { useNotificationStore } from '../../lib/store/notificationStore';
import {
  Check,
  Zap,
  Star,
  Building,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Lock,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface PlanTier {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  features: Record<string, any>;
  priceCode?: string | null;
}

function PlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, subscription, isAuthenticated, setAuth, initAuth } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [plans, setPlans] = React.useState<PlanTier[]>([]);
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [isLoadingPlans, setIsLoadingPlans] = React.useState(true);
  const [processingPlanId, setProcessingPlanId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Check if checkout was cancelled
  React.useEffect(() => {
    initAuth();
    if (searchParams.get('cancelled') === 'true') {
      addToast({
        type: 'info',
        title: 'Checkout Cancelled',
        message: 'You cancelled Stripe checkout. You can select a plan whenever you are ready.',
      });
    }
  }, [searchParams, initAuth, addToast]);

  // Load available subscription plans from backend API
  React.useEffect(() => {
    async function fetchPlans() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${apiUrl}/v1/subscriptions/plans`);
        if (!res.ok) throw new Error('Failed to load available plans');
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : data?.data || []);
      } catch (err: any) {
        setErrorMsg('Unable to retrieve plans from billing server.');
      } finally {
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, []);

  const currentPlanName = (subscription?.plan || user?.plan || '').toLowerCase();
  const isSubActive = subscription?.isActive ?? (user?.subscriptionStatus === 'ACTIVE');

  // Plan feature breakdowns
  const PLAN_FEATURES: Record<string, { badge?: string; list: string[]; limits: string }> = {
    Free: {
      limits: '100 API queries / mo',
      list: [
        'Top 5 LSTM capital flow predictions',
        '1-Month macro forecast horizon',
        'Basic technical indicators (SMA, RSI)',
        '1 Personal quantitative workspace',
        'Standard community support',
      ],
    },
    Pro: {
      badge: 'Most Popular',
      limits: '1,000 API queries / mo',
      list: [
        'Full multi-horizon predictions (1M, 3M, 6M, 1Y)',
        'SNA Causal Event Graph & Visualizations',
        'Node centrality & bridge event tracking',
        'Flow matrices across 45+ FX corridors',
        'API keys generation & rotation',
        'Priority quantitative support',
      ],
    },
    Enterprise: {
      badge: 'Institutional',
      limits: 'Unlimited API queries / mo',
      list: [
        'Everything in Pro Trader tier',
        'Custom LLM News Attribution Model',
        'Point-in-time leakage testing suite',
        'Multi-tenant team workspaces (up to 99)',
        'Dedicated SLA (<10ms inference pipeline)',
        'Dedicated quantitative account manager',
      ],
    },
  };

  const handleSubscribe = async (plan: PlanTier) => {
    setErrorMsg(null);

    // If not authenticated, redirect to login first
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/plans')}`);
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      const token = useAuthStore.getState().accessToken;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

      // 1. If Free Plan: activate directly
      if (plan.name === 'Free' || plan.price === 0) {
        const res = await fetch(`${apiUrl}/v1/subscriptions/activate-free`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to activate free tier');

        // Update local session
        if (user && token) {
          setAuth(
            { ...user, plan: 'free', subscriptionStatus: 'ACTIVE' },
            token,
            {
              plan: 'Free',
              status: 'ACTIVE',
              isActive: true,
            }
          );
        }

        addToast({
          type: 'success',
          title: 'Plan Activated',
          message: 'Your Free Sandbox tier is now active! Entering dashboard...',
        });

        router.push('/dashboard');
        return;
      }

      // 2. Paid Plan (Pro / Enterprise): Call real Stripe Checkout Session
      const res = await fetch(`${apiUrl}/v1/subscriptions/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to initialize Stripe checkout session.');
      }

      const checkoutUrl = data?.checkoutUrl || data?.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Stripe did not return a valid checkout session URL.');
      }

      addToast({
        type: 'info',
        title: 'Redirecting to Stripe',
        message: 'Opening Stripe secure checkout. Please enter your Stripe test card details.',
      });

      // Redirect directly to actual Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
      setProcessingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      {/* Background radial glow */}
      <div className="max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-8 border-b border-slate-800">
          <Link href={isAuthenticated && isSubActive ? '/dashboard' : '/'} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
              X
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">GeoCap-X</span>
              <span className="ml-2 text-xs font-mono text-indigo-400">Billing & Subscriptions</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Signed in as <span className="font-semibold text-white">{user?.email}</span>
                </span>
                {isSubActive && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center pt-10 pb-8 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Official Stripe Test Mode Integration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Select Your Quantitative Access Tier
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Gain immediate access to global capital flow models, point-in-time causal event networks, and multi-horizon predictions.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-3 mt-6 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="max-w-xl mx-auto mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* Loading State */}
        {isLoadingPlans ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Loading institutional tiers & Stripe price identifiers...</p>
          </div>
        ) : (
          /* Plans Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {plans.map((plan) => {
              const isCurrent = isSubActive && currentPlanName === plan.name.toLowerCase();
              const isPro = plan.name === 'Pro';
              const isEnterprise = plan.name === 'Enterprise';
              const meta = PLAN_FEATURES[plan.name] || {
                limits: 'Standard allocation',
                list: ['Institutional prediction access', 'Audit provenance tracing'],
              };

              // Compute price based on cycle
              const price = billingCycle === 'yearly' && plan.price > 0
                ? Math.round(plan.price * 0.8)
                : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border transition-all duration-200 ${
                    isPro
                      ? 'border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  {/* Badge */}
                  {meta.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white shadow-md">
                        {meta.badge}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {plan.name === 'Free' ? (
                        <Star className="h-5 w-5 text-slate-400" />
                      ) : isPro ? (
                        <Zap className="h-5 w-5 text-indigo-400" />
                      ) : (
                        <Building className="h-5 w-5 text-cyan-400" />
                      )}
                      <h3 className="text-lg font-bold text-white">{plan.name} Tier</h3>
                    </div>

                    <p className="text-xs text-slate-400 min-h-[36px] leading-relaxed">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mt-5 pb-5 border-b border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-white tracking-tight font-mono">
                          ${price}
                        </span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </div>
                      <p className="text-[11px] font-mono text-indigo-400 mt-1">{meta.limits}</p>
                    </div>

                    {/* Features List */}
                    <div className="py-6 space-y-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        What's Included:
                      </p>
                      <ul className="space-y-2.5">
                        {meta.list.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                            <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 border-t border-slate-800">
                    {isCurrent ? (
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all hover:bg-slate-700"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Active Plan · Open Dashboard</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={processingPlanId !== null}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${
                          isPro
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-white hover:bg-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {processingPlanId === plan.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>
                              {plan.price === 0 ? 'Activating Tier...' : 'Opening Stripe Checkout...'}
                            </span>
                          </>
                        ) : plan.price === 0 ? (
                          <>
                            <span>Activate Free Tier</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <span>Subscribe via Stripe Checkout</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Security & Guarantee Notes */}
        <div className="mt-14 p-6 rounded-3xl border border-slate-800 bg-slate-900/40 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>Actual Stripe Hosted Checkout with End-to-End SSL Encryption</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            All card payments are securely routed directly to Stripe. GeoCap-X never stores or handles raw card credentials. Cancel anytime with 1-click in your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PlansPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-xs text-slate-500 font-mono gap-3">
          <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
          <span>Loading subscription plans...</span>
        </div>
      }
    >
      <PlansContent />
    </React.Suspense>
  );
}

