'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../../lib/store/authStore';
import { useNotificationStore } from '../../../../lib/store/notificationStore';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [isProcessing, setIsProcessing] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const code = searchParams.get('code');
  const error = searchParams.get('error');

  React.useEffect(() => {
    async function exchangeGoogleCode() {
      if (error) {
        setErrorMessage(`Google OAuth error: ${error}`);
        setIsProcessing(false);
        return;
      }

      if (!code) {
        setErrorMessage('No authorization code received from Google.');
        setIsProcessing(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${apiUrl}/v1/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Failed to authenticate with Google account.');
        }

        const { accessToken, user, subscription, redirectTo } = data;

        setAuth(user, accessToken, subscription);

        addToast({
          type: 'success',
          title: 'Google Authentication Successful',
          message: `Signed in as ${user.firstName || user.email}!`,
        });

        router.replace(redirectTo || '/plans');
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to complete Google authentication.');
      } finally {
        setIsProcessing(false);
      }
    }

    exchangeGoogleCode();
  }, [code, error, router, setAuth, addToast]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl text-center">
        {isProcessing ? (
          <div className="py-8 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Authenticating with Google</h2>
            <p className="text-xs text-slate-400 font-mono">
              Verifying Google token credentials & establishing institutional session...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="py-4 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Sign In Failed</h2>
              <p className="text-xs text-rose-300 mt-1">{errorMessage}</p>
            </div>
            <div className="pt-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500 font-mono">Connecting to Google...</div>}>
      <GoogleCallbackContent />
    </React.Suspense>
  );
}
