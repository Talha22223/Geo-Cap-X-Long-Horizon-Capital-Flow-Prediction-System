import * as React from 'react';
import Link from 'next/link';
import { GitBranch, Activity, ShieldCheck, TrendingUp, Sparkles, Lock, ArrowUpRight } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* ─── LEFT SIDE: Institutional Visual & Branding Section (Desktop / Tablet) ─── */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-10 xl:p-14 overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40">
        {/* Ambient Glow & Grid Backdrop */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-600/15 blur-[140px] pointer-events-none" />

        {/* Top: Logo & Platform Identity */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-indigo-400/30 group-hover:scale-105 transition-transform duration-300">
              <span className="font-black text-white text-xl tracking-wider">X</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">GeoCap-X</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  V9.2 Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">Institutional Capital Flow Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Center: Hero Description & 3 Value Pillars */}
        <div className="relative z-10 max-w-xl my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Macroeconomic Event Causal Engine</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Predict Global Capital Flows with High-Horizon Provenance.
          </h1>

          <p className="text-sm xl:text-base text-slate-400 leading-relaxed mb-8">
            Correlate central bank policy shifts, sovereign bond yields, and cross-border currency vectors into actionable quantitative predictions with verified lookahead protection.
          </p>

          {/* 3 Concise Product Benefits */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <GitBranch className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">SNA Causal Event Networks</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Map contagion risk across 10-tier event graphs with node centrality and modular community clustering.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Point-in-Time Provenance</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Every forecast carries full audit traces, deduplication hashes, and strict anti-leakage time filtering.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700/80 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Multi-Horizon Forecasting</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Dual-stream LSTM & Transformer networks generating 1M, 3M, 6M, and 1-Year directional forecasts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Institutional Metrics Bar */}
        <div className="relative z-10 pt-6 border-t border-slate-800/60">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-lg xl:text-xl font-bold font-mono text-white">99.8%</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Audit Integrity</p>
            </div>
            <div>
              <p className="text-lg xl:text-xl font-bold font-mono text-white">45+</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">FX Corridors</p>
            </div>
            <div>
              <p className="text-lg xl:text-xl font-bold font-mono text-white">&lt;15ms</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Inference SLA</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT SIDE: Auth Card & Interactive Viewport ─── */}
      <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative overflow-y-auto">
        {/* Mobile Header Branding */}
        <div className="lg:hidden flex items-center justify-between pb-6 mb-4 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-base">
              X
            </div>
            <span className="text-lg font-bold text-white">GeoCap-X</span>
          </Link>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            Auth Gateway
          </span>
        </div>

        {/* Auth Content Card */}
        <div className="w-full max-w-md mx-auto my-auto py-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {children}
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="w-full max-w-md mx-auto pt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Lock className="h-3 w-3 text-emerald-500" />
            <span>Argon2id & AES-256 Encrypted · Strict Server Session Verification</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5">
            By signing in you agree to institutional terms of access and data licensing.
          </p>
        </div>
      </div>
    </div>
  );
}
