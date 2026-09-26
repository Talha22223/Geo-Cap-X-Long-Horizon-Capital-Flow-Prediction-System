'use client';

/**
 * ============================================================================
 * FRONTEND SUBSCRIPTION GATE UI COMPONENT (SubscriptionGate)
 * ============================================================================
 * WHAT:
 *   Visual access gate for Pro and Enterprise exclusive features.
 *   - Checks `user.plan` against `requiredTier` ('pro' | 'enterprise') and super admin status.
 *   - Unlocked: Renders children normally.
 *   - Locked: Renders a glassmorphic paywall card explaining feature benefits and
 *     offering an instant Stripe test checkout modal simulator.
 *
 * WHY:
 *   Provides intuitive upsell triggers and allows evaluation panels to test
 *   upgrading on the fly without breaking UI workflows.
 * ============================================================================
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store/authStore';
import { useNotificationStore } from '../../lib/store/notificationStore';
import { Lock, Sparkles, CreditCard, ShieldCheck, Check, ArrowRight, Zap } from 'lucide-react';

interface SubscriptionGateProps {
  requiredTier?: 'pro' | 'enterprise';
  featureName: string;
  description?: string;
  children: React.ReactNode;
  fallbackType?: 'card' | 'inline' | 'blur';
}

export function SubscriptionGate({
  requiredTier = 'pro',
  featureName,
  description,
  children,
  fallbackType = 'card',
}: SubscriptionGateProps) {
  const { user, isSuperAdmin, canAccessPro, updateUser } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Check access
  const hasAccess =
    isSuperAdmin() ||
    (requiredTier === 'pro' && (user?.plan === 'pro' || user?.plan === 'enterprise')) ||
    (requiredTier === 'enterprise' && user?.plan === 'enterprise');

  if (hasAccess) {
    return <>{children}</>;
  }

  const handleSimulateStripePayment = async () => {
    setIsProcessing(true);
    await new Promise((res) => setTimeout(res, 1200));

    updateUser({
      plan: requiredTier,
      subscriptionStatus: 'ACTIVE',
    });

    setIsProcessing(false);
    setShowCheckoutModal(false);

    addToast({
      type: 'success',
      title: `${requiredTier.toUpperCase()} Subscription Activated!`,
      message: `Your Stripe test payment succeeded. ${featureName} is now fully unlocked.`,
    });
  };

  const defaultDesc =
    description ||
    `This feature is locked on the Free Sandbox tier. Upgrade to ${
      requiredTier === 'enterprise' ? 'Enterprise' : 'Pro Trader'
    } to unlock high-capacity forecast engines, event causal graph analysis, and real-time alerts.`;

  return (
    <>
      <div className="relative rounded-2xl border border-dashed border-indigo-500/30 bg-gradient-to-b from-indigo-500/5 via-transparent to-slate-100/50 dark:to-slate-900/40 p-8 text-center flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10">
          <Lock className="h-6 w-6" />
        </div>

        <div className="max-w-md space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
            <Sparkles className="h-3 w-3" />
            {requiredTier.toUpperCase()} Tier Exclusive
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Unlock {featureName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {defaultDesc}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/25 active:scale-95"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Upgrade with Stripe ($129/mo)
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Stripe Developer Mode
          </span>
          <span>•</span>
          <span>Instant Activation</span>
          <span>•</span>
          <span>Cancel Anytime</span>
        </div>
      </div>

      {/* Stripe Developer Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Stripe Test Checkout
                  </h3>
                  <p className="text-[10px] text-slate-500">Developer Sandbox Simulator</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {requiredTier === 'enterprise' ? 'Enterprise Quant' : 'Pro Trader Tier'}
                </p>
                <p className="text-[10px] text-slate-500">Monthly billing recurring</p>
              </div>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                ${requiredTier === 'enterprise' ? '499.00' : '129.00'}/mo
              </span>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Card Number (Stripe 4242 Test)
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-transparent font-mono outline-none text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] font-bold text-indigo-500">VISA</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Expires
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleSimulateStripePayment}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Zap className="h-3.5 w-3.5 animate-spin" />
                    Authorizing with Stripe API...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Pay ${requiredTier === 'enterprise' ? '499.00' : '129.00'} & Unlock Instantly
                  </>
                )}
              </button>

              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-full py-2 rounded-xl text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
