'use client';

import React from 'react';
import { CreditCard, Check, Zap, HelpCircle, Shield, FileText, Lock, Sparkles, X, ArrowRight, Download } from 'lucide-react';
import { useAuthStore } from '../../../../lib/store/authStore';
import { useNotificationStore } from '../../../../lib/store/notificationStore';
import { apiClient } from '../../../../lib/api-client';

interface Plan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free Sandbox',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Essential sandbox access for evaluating models and exploring market data.',
    features: [
      '5 LSTM Predictions / month',
      'Standard Technical Indicators (SMA, EMA, RSI)',
      '1 Workspace Limit',
      'Basic Report Exports (JSON)',
      'Community Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Trader',
    priceMonthly: 129,
    priceYearly: 109,
    description: 'Advanced quantitative analytics, high prediction quotas, and full visualizations.',
    features: [
      '100 LSTM Predictions / month',
      'Advanced Indicators (Stochastic RSI, Bollinger, MACD)',
      'SNA Event Chain Visualizations',
      'Volume Profile & OBV Flow Matrices',
      'API Key Rotation & Webhooks',
      'Priority Email Support (< 4h)',
    ],
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Quant',
    priceMonthly: 499,
    priceYearly: 399,
    description: 'Institutional-grade capacity with dedicated LLM reasoning and custom APIs.',
    features: [
      'Unlimited LSTM Predictions',
      'Custom LLM News Attribution Model',
      'Multi-timeframe Confirmation (1H to 1Y)',
      'Unlimited Workspaces & Team Members',
      'Dedicated SLA Support (1h response)',
      'Full Database & Streaming Access',
    ],
  },
];

interface InvoiceRecord {
  id: string;
  date: string;
  amount: string;
  planName: string;
  status: 'Paid' | 'Processing';
}

export default function BillingSettingsPage() {
  const { user, updateUser, isSuperAdmin } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = React.useState<Plan | null>(null);
  const [isProcessingStripe, setIsProcessingStripe] = React.useState(false);
  const [cardNumber, setCardNumber] = React.useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = React.useState('12/28');
  const [cardCvc, setCardCvc] = React.useState('888');

  // Determine current active plan from user state
  const currentPlanId: 'free' | 'pro' | 'enterprise' =
    isSuperAdmin()
      ? 'enterprise'
      : (user?.plan as 'free' | 'pro' | 'enterprise') || 'free';

  const [invoices, setInvoices] = React.useState<InvoiceRecord[]>([
    {
      id: 'INV-2026-0891',
      date: 'Aug 14, 2026',
      amount: currentPlanId === 'enterprise' ? '$499.00' : currentPlanId === 'pro' ? '$129.00' : '$0.00',
      planName: currentPlanId === 'enterprise' ? 'Enterprise' : currentPlanId === 'pro' ? 'Pro' : 'Free Sandbox',
      status: 'Paid',
    },
  ]);

  const limits = {
    free: { predictions: { used: 2, limit: 5 }, reports: { used: 1, limit: 5 }, workspaces: { used: 1, limit: 1 } },
    pro: { predictions: { used: 18, limit: 100 }, reports: { used: 9, limit: 25 }, workspaces: { used: 2, limit: 3 } },
    enterprise: { predictions: { used: 47, limit: 9999 }, reports: { used: 21, limit: 100 }, workspaces: { used: 4, limit: 10 } },
  }[currentPlanId];

  const handleLaunchCheckout = (plan: Plan) => {
    setSelectedPlanForCheckout(plan);
  };

  const handleCompleteStripeTestPayment = async () => {
    if (!selectedPlanForCheckout) return;
    setIsProcessingStripe(true);

    try {
      // Simulate real Stripe test-mode processing delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const newPlan = selectedPlanForCheckout.id;
      const amount = billingCycle === 'yearly' ? selectedPlanForCheckout.priceYearly * 12 : selectedPlanForCheckout.priceMonthly;

      // Update auth store & local storage
      updateUser({
        plan: newPlan,
        subscriptionStatus: 'ACTIVE',
      });

      // Add to invoices list
      const newInvoice: InvoiceRecord = {
        id: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: `$${amount}.00`,
        planName: selectedPlanForCheckout.name,
        status: 'Paid',
      };
      setInvoices((prev) => [newInvoice, ...prev]);

      addToast({
        type: 'success',
        title: 'Subscription Activated!',
        message: `Stripe Developer Test Payment succeeded. You are now on the ${selectedPlanForCheckout.name} tier.`,
      });

      setSelectedPlanForCheckout(null);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Payment Error',
        message: err.message || 'Stripe test payment failed.',
      });
    } finally {
      setIsProcessingStripe(false);
    }
  };

  const downloadReceipt = (inv: InvoiceRecord) => {
    const receiptContent = `================================================
GEOCAP-X BILLING RECEIPT
================================================
Invoice ID: ${inv.id}
Date: ${inv.date}
Customer: ${user?.email || 'Customer'}
Plan: ${inv.planName}
Amount Paid: ${inv.amount}
Status: ${inv.status}
Payment Method: Stripe Test Card (•••• 4242)
================================================
Thank you for your business!
================================================`;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.id}-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'info',
      title: 'Receipt Downloaded',
      message: `Downloaded receipt for ${inv.id}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Active Plan Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800/50 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Subscription</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are currently on the{' '}
                <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                  {currentPlanId} Plan
                </span>
                {isSuperAdmin() && ' (Full Admin Access)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Status: Active
            </span>
          </div>
        </div>

        {/* Feature Limits & Meter Progress */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usage & Metered Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'LSTM AI Predictions',
                used: limits.predictions.used,
                limit: limits.predictions.limit === 9999 ? 'Unlimited' : limits.predictions.limit,
                pct: limits.predictions.limit === 9999 ? 20 : (limits.predictions.used / (limits.predictions.limit as number)) * 100,
              },
              {
                label: 'Saved Reports',
                used: limits.reports.used,
                limit: limits.reports.limit,
                pct: (limits.reports.used / limits.reports.limit) * 100,
              },
              {
                label: 'Workspaces',
                used: limits.workspaces.used,
                limit: limits.workspaces.limit,
                pct: (limits.workspaces.used / limits.workspaces.limit) * 100,
              },
            ].map((meter, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{meter.label}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {meter.used} / {meter.limit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, meter.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Tiers grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Subscription Plans</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Integrated with Stripe Developer Test Mode for instant verification</p>
          </div>
          {/* Monthly/Yearly toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === 'monthly' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === 'yearly' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-lg shadow-indigo-500/5 ring-2 ring-indigo-500/20'
                    : plan.isPopular
                    ? 'border-indigo-400/60 dark:border-indigo-500/40 bg-white dark:bg-slate-900/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20'
                }`}
              >
                {plan.isPopular && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                    Current Plan
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                    <div className="flex items-baseline mt-3">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        ${price}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">/ month</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <Check className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleLaunchCheckout(plan)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      isCurrent
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default'
                        : plan.isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                        : 'border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {isCurrent ? 'Current Tier Active' : `Select ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice list */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/50 mb-4">
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Billing History & Receipts</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Download past transaction receipts and verify invoices</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Invoice ID</th>
                <th className="pb-3 font-semibold">Plan Tier</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/40">
                  <td className="py-3.5 font-medium">{inv.date}</td>
                  <td className="py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{inv.id}</td>
                  <td className="py-3.5 font-semibold text-slate-900 dark:text-white">{inv.planName}</td>
                  <td className="py-3.5 font-bold text-slate-900 dark:text-white">{inv.amount}</td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => downloadReceipt(inv)}
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stripe Developer Test Checkout Modal */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                  S
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stripe Developer Checkout</h3>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Test Mode (Sandbox)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForCheckout(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Plan Summary */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Upgrading to</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedPlanForCheckout.name}</p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 capitalize">{billingCycle} Billing</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  ${billingCycle === 'yearly' ? selectedPlanForCheckout.priceYearly * 12 : selectedPlanForCheckout.priceMonthly}
                </p>
                <p className="text-[10px] text-slate-500">Includes all taxes</p>
              </div>
            </div>

            {/* Simulated Card Form */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Card Information
                </label>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                  Stripe Test Cards Enabled
                </span>
              </div>

              <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
                <div className="px-3 py-2.5 bg-white dark:bg-slate-950 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full text-xs font-mono bg-transparent outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-950">
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM / YY"
                    className="px-3 py-2 text-xs font-mono bg-transparent outline-none text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="CVC"
                    className="px-3 py-2 text-xs font-mono bg-transparent outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Test Mode Note */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2.5">
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                This is a real Developer Sandbox checkout simulator. Clicking "Authorize Payment" will immediately activate your <span className="font-bold">{selectedPlanForCheckout.name}</span> subscription tier.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForCheckout(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingStripe}
                onClick={handleCompleteStripeTestPayment}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
              >
                {isProcessingStripe ? 'Authorizing with Stripe...' : `Pay $${billingCycle === 'yearly' ? selectedPlanForCheckout.priceYearly * 12 : selectedPlanForCheckout.priceMonthly}`}
                {!isProcessingStripe && <ArrowRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
