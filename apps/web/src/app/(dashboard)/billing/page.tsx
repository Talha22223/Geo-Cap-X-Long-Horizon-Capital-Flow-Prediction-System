'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import { useAuthStore } from '../../../lib/store/authStore';
import { useNotificationStore } from '../../../lib/store/notificationStore';
import { CreditCard, Check, ArrowRight, Zap, Star, Building, ShieldCheck, Loader2 } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Foundational query limits for hobbyists & testing',
    icon: Star,
    features: ['100 API queries / month', 'Top 5 LSTM predictions', '1-Month macro horizon', 'Basic technical indicators', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 49, yearly: 39 },
    description: 'Institutional analytics features & full multi-horizon access',
    icon: Zap,
    popular: true,
    features: ['1,000 API queries / month', 'All Visualizations (SNA Event Chains)', 'Full multi-horizon predictions (1M, 3M, 6M, 1Y)', 'Node centrality & flow matrices', 'API keys generation & rotation', 'Priority quantitative support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 499, yearly: 399 },
    description: 'Unlimited queries, custom models support & multi-tenant controls',
    icon: Building,
    features: ['Unlimited API queries / month', 'Custom LLM News Attribution Model', 'Point-in-time leakage testing suite', 'Up to 99 team workspaces', 'Dedicated SLA (<10ms inference)', 'Dedicated quantitative account manager'],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const { user, subscription } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [billing, setBilling] = React.useState<'monthly' | 'yearly'>('monthly');
  const [isOpeningPortal, setIsOpeningPortal] = React.useState(false);

  const currentPlan = (subscription?.plan || user?.plan || 'Free').toUpperCase();
  const isSubActive = subscription?.isActive ?? (user?.subscriptionStatus === 'ACTIVE');
  const renewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Next billing cycle';

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const token = useAuthStore.getState().accessToken;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/v1/subscriptions/portal-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        router.push('/plans');
      }
    } catch {
      router.push('/plans');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscription Management"
        description="Manage your institutional tier, payment methods, and usage quotas"
      />

      {/* Current plan banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/5 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                You are on the {currentPlan} Tier
              </p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isSubActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {isSubActive ? 'Active' : 'Unpaid'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Billing renewal: {renewalDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenPortal}
            disabled={isOpeningPortal}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isOpeningPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Stripe Portal'}
          </button>
          <Link
            href="/plans"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
          >
            <span>Change Tier</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <span className={`text-xs font-semibold ${billing === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Monthly</span>
        <button
          onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${billing === 'yearly' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billing === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className={`text-xs font-semibold ${billing === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
          Yearly <span className="ml-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">-20%</span>
        </span>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan, i) => {
          const isThisPlanCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-3xl border p-6 flex flex-col justify-between shadow-sm dark:shadow-none ${
                isThisPlanCurrent
                  ? 'border-indigo-500/60 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <plan.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                </div>

                <div className="mb-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                    ${plan.price[billing]}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">/ month</span>
                </div>

                <p className="text-xs text-slate-500 mb-5 leading-relaxed">{plan.description}</p>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {isThisPlanCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    Current Active Tier
                  </div>
                ) : (
                  <Link
                    href="/plans"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    <span>Switch to {plan.name}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Security notice */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          All subscriptions are processed via Stripe Test Mode infrastructure. Real webhooks update plan allowances, and token validation ensures genuine role enforcement.
        </p>
      </div>
    </div>
  );
}
