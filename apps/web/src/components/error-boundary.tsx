'use client';

import * as React from 'react';
import { Button } from '@geocap-x/ui';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Application Error</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                An unexpected error occurred in this view. Please try reloading or contact support if the issue persists.
              </p>
              {this.state.error && (
                <pre className="text-xs text-left p-3 rounded-lg bg-black/40 border border-slate-800 text-rose-300/80 overflow-auto max-h-32 mt-2">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <Button
              variant="outline"
              size="md"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
