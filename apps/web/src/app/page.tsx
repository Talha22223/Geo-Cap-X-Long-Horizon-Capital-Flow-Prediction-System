'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../lib/store/themeStore';
import { useNotificationStore } from '../lib/store/notificationStore';
import { ParticleCanvas } from '../components/particle-canvas';
import {
  Sparkles,
  Zap,
  Globe,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  Check,
  ChevronDown,
  Mail,
  ShieldCheck,
  Cpu,
  BarChart3,
  Calendar,
  Compass
} from 'lucide-react';

export default function MarketingLandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const addToast = useNotificationStore((state) => state.addToast);

  
  // States
  const [billingPeriod, setBillingPeriod] = React.useState<'monthly' | 'yearly'>('monthly');
  const [activeShowcaseTab, setActiveShowcaseTab] = React.useState<'prediction' | 'chains' | 'scans'>('prediction');
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);
  const [emailInput, setEmailInput] = React.useState('');
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = React.useState(false);

  // Animations Scale (Framer Motion)
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.15 } }
  };

  // Toast triggers
  const handleCtaTrigger = (ctaLabel: string, redirect: boolean = true) => {
    addToast({
      type: 'info',
      title: `${ctaLabel} Activated`,
      message: redirect
        ? `GeoCap-X sandbox environment is being initialized. Redirecting...`
        : `Thank you for your interest! A sales representative will contact you shortly.`,
    });
    if (redirect) {
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    }
  };

  // Newsletter handler
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
      });
      return;
    }
    setIsNewsletterSubmitting(true);
    setTimeout(() => {
      addToast({
        type: 'success',
        title: 'Subscribed Successfully',
        message: 'You have subscribed to the GeoCap-X analytics briefing.',
      });
      setEmailInput('');
      setIsNewsletterSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Animated Particles Backdrop */}
      <ParticleCanvas />

      {/* Radiant Glow Overlays */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* 1. HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 w-full px-6 py-4">
        <div className="max-w-7xl mx-auto glass-panel rounded-2xl flex items-center justify-between px-6 py-3 shadow-md dark:shadow-none transition-all duration-300">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black shadow-sm">
              G
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-950 to-slate-800 dark:from-white dark:to-slate-300">
              GeoCap-X
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
            <a href="#showcase" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Showcase</a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={() => router.push('/login')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition-colors"
            >
              Sign In
            </button>

            {/* Launch Console */}
            <button
              onClick={() => router.push('/register')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all duration-200 shadow-md shadow-indigo-500/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 text-center z-10">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* Release Badge */}
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Macroeconomic Predictions Framework V2.0
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] text-slate-950 dark:text-white">
            Predict Global Capital Flows with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300">
              Explainable AI
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p variants={fadeInUp} className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Real-time capital flow forecasting, predictive anomaly indicators, and deep event path attribution built for global financial enterprises.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => handleCtaTrigger('Direct Sandbox Launch')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base transition-all duration-300 shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 group"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => handleCtaTrigger('Contact Enterprise Sales', false)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              Book Enterprise Demo
            </button>
          </motion.div>

          {/* Dynamic Mock Dashboard Preview */}
          <motion.div
            variants={fadeInUp}
            className="pt-16 max-w-5xl mx-auto"
          >
            <div className="glass-panel p-4 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/80 bg-white/30 dark:bg-slate-950/40 relative">
              {/* Fake top bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/60 mb-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="px-4 py-1 rounded-lg bg-slate-200/50 dark:bg-slate-900 text-xs text-slate-500 font-mono">
                  geocapx-platform.corp/analytics
                </div>
                <div className="w-8" />
              </div>

              {/* Fake Dashboard Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* Visual Widget 1 */}
                <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">USD Flow Direction</span>
                    <Globe className="h-4 w-4 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">Net Inflow</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>+12.4% vs last week</span>
                  </div>
                </div>

                {/* Visual Widget 2 */}
                <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Anomaly Risk Factor</span>
                    <Activity className="h-4 w-4 text-violet-500" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">Stable (0.12)</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Monitored in 15 timeframes</span>
                  </div>
                </div>

                {/* Visual Widget 3 */}
                <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Predictive Confidence</span>
                    <Layers className="h-4 w-4 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">94.8%</h3>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-500 font-semibold">
                    <span>Backtested over 8 quarters</span>
                  </div>
                </div>
              </div>

              {/* Chart visualization Mock */}
              <div className="mt-6 p-6 rounded-2xl bg-white/85 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/40 h-56 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Aggregate Capital Prediction Stream (LSTM v2)</span>
                  <span className="font-mono text-indigo-500">Predicted Horizon: 90 Days</span>
                </div>
                {/* SVG Curve Mock */}
                <div className="w-full flex-grow relative mt-4 flex items-end">
                  <svg className="w-full h-full text-indigo-500" viewBox="0 0 800 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,80 Q100,20 200,60 T400,90 T600,30 T800,50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M0,80 Q100,20 200,60 T400,90 T600,30 T800,50 L800,120 L0,120 Z"
                      fill="url(#gradient-area)"
                    />
                  </svg>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-3 font-mono">
                  <span>T-30 Days</span>
                  <span>Today</span>
                  <span>T+30 Days (Forecast)</span>
                  <span>T+60 Days (Forecast)</span>
                  <span>T+90 Days (Forecast)</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* 3. TRUSTED BY MARQUEE */}
      <section className="py-12 border-y border-slate-200/60 dark:border-slate-900 bg-white/40 dark:bg-slate-950/20 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            ENGINE TRUSTED BY ANALYSTS AT LEADING ENTERPRISES
          </p>
        </div>
        
        {/* Infinite Loop Marquee */}
        <div className="marquee-container opacity-60">
          <div className="marquee-content font-mono font-bold text-slate-500 tracking-wider text-sm">
            <span>VERCEL // PLATFORM</span>
            <span>STRIPE // BILLING</span>
            <span>LINEAR // WORKFLOW</span>
            <span>PERPLEXITY // AI</span>
            <span>MERCURY // BANKING</span>
            <span>RAYCAST // INTERFACE</span>
            <span>NOTION // KNOWLEDGE</span>
          </div>
          {/* Clone for loop */}
          <div className="marquee-content font-mono font-bold text-slate-500 tracking-wider text-sm">
            <span>VERCEL // PLATFORM</span>
            <span>STRIPE // BILLING</span>
            <span>LINEAR // WORKFLOW</span>
            <span>PERPLEXITY // AI</span>
            <span>MERCURY // BANKING</span>
            <span>RAYCAST // INTERFACE</span>
            <span>NOTION // KNOWLEDGE</span>
          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white">
            Designed for Macro Analytics
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base">
            GeoCap-X integrates multi-timeframe analytics, anomaly triggers, and predictive modeling frameworks in a clean design.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <motion.div
            whileHover={{ y: -6 }}
            className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex flex-col justify-between h-80 transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">AI Event Chains</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Graph based sequence models mapping macroeconomic event chains and global geopolitical triggers.
              </p>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Attribution graph &rarr;</span>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileHover={{ y: -6 }}
            className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex flex-col justify-between h-80 transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">Capital Flow Prediction</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                LSTM neural models trained on historical balance-of-payments indexes forecasting net inflows.
              </p>
            </div>
            <span className="text-xs text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">Forecast models &rarr;</span>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileHover={{ y: -6 }}
            className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex flex-col justify-between h-80 transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">Explainable AI</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                SHAP model attributions outlining exact macro metrics driving prediction directions.
              </p>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">SHAP values &rarr;</span>
          </motion.div>
        </div>
      </section>

      {/* 5. INTERACTIVE PRODUCT SHOWCASE */}
      <section id="showcase" className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            {/* Left selector */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Explore the Platform
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Toggle through platform features to preview visual telemetry overlays in the sandbox interface.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setActiveShowcaseTab('prediction')}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between border transition-all duration-200 ${
                    activeShowcaseTab === 'prediction'
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4.5 w-4.5" />
                    <span className="font-bold text-sm">Long-Horizon Prediction</span>
                  </div>
                  <Check className={`h-4 w-4 ${activeShowcaseTab === 'prediction' ? 'opacity-100' : 'opacity-0'}`} />
                </button>

                <button
                  onClick={() => setActiveShowcaseTab('chains')}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between border transition-all duration-200 ${
                    activeShowcaseTab === 'chains'
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4.5 w-4.5" />
                    <span className="font-bold text-sm">AI Event Attribution Chains</span>
                  </div>
                  <Check className={`h-4 w-4 ${activeShowcaseTab === 'chains' ? 'opacity-100' : 'opacity-0'}`} />
                </button>

                <button
                  onClick={() => setActiveShowcaseTab('scans')}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between border transition-all duration-200 ${
                    activeShowcaseTab === 'scans'
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-4.5 w-4.5" />
                    <span className="font-bold text-sm">Macro Volatility Scans</span>
                  </div>
                  <Check className={`h-4 w-4 ${activeShowcaseTab === 'scans' ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              </div>
            </div>

            {/* Right mock rendering */}
            <div className="lg:col-span-3 h-80 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
              <AnimatePresence mode="wait">
                {activeShowcaseTab === 'prediction' && (
                  <motion.div
                    key="prediction"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs text-indigo-500 font-mono tracking-wider font-semibold uppercase">Prediction View</span>
                      <h4 className="text-lg font-bold text-slate-950 dark:text-white mt-1">90-Day Capital Forecast Stream</h4>
                    </div>
                    {/* Simulated visual */}
                    <div className="w-full flex-grow flex items-end justify-between gap-2 h-32 pt-6">
                      {[60, 45, 80, 55, 90, 75, 110].map((h, idx) => (
                        <div key={idx} className="flex-grow flex flex-col items-center">
                          <div
                            style={{ height: `${h}px` }}
                            className="w-full bg-gradient-to-t from-indigo-500 to-violet-500 rounded-lg"
                          />
                          <span className="text-[10px] text-slate-400 font-mono mt-2">W{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeShowcaseTab === 'chains' && (
                  <motion.div
                    key="chains"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs text-violet-500 font-mono tracking-wider font-semibold uppercase">Attribution Chains</span>
                      <h4 className="text-lg font-bold text-slate-950 dark:text-white mt-1">Shapley Attributions Flow Map</h4>
                    </div>
                    {/* Node map mockup */}
                    <div className="flex-grow flex items-center justify-around py-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold">
                        G7 Rate
                      </div>
                      <div className="h-0.5 w-12 bg-indigo-500/40 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center text-xs font-bold">
                        FX Index
                      </div>
                      <div className="h-0.5 w-12 bg-indigo-500/40 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold">
                        Predict
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeShowcaseTab === 'scans' && (
                  <motion.div
                    key="scans"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs text-emerald-500 font-mono tracking-wider font-semibold uppercase">Volatility View</span>
                      <h4 className="text-lg font-bold text-slate-950 dark:text-white mt-1">Multi-Timeframe Scans Result</h4>
                    </div>
                    {/* Simulated Table */}
                    <div className="flex-grow pt-4 flex flex-col justify-center gap-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-200/40 dark:bg-slate-800/40 text-xs">
                        <span className="font-semibold">Short-horizon (24h)</span>
                        <span className="font-mono text-emerald-500">Low Volatility</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-200/40 dark:bg-slate-800/40 text-xs">
                        <span className="font-semibold">Mid-horizon (30d)</span>
                        <span className="font-mono text-yellow-500">Moderate Risk</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white">
            Workflow Attributions
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base">
            From macroeconomic data fetch to LSTM forecast attribution in three straightforward cycles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Step 1 */}
          <div className="space-y-4 relative">
            <div className="h-10 w-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Data Ingestion</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Platform workers parse balance-of-payments databases and central banks rates indicators.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-4 relative">
            <div className="h-10 w-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Predictive Forecasts</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              LSTM forecasting pipelines evaluate timeframe trends to calculate directional weights.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-4 relative">
            <div className="h-10 w-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Attribution Logs</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Explainable SHAP matrices outline the key macroeconomic events driving the forecasts.
            </p>
          </div>
        </div>
      </section>

      {/* 7. PRICING GRID */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white">
            Subscription Pricing Plans
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base">
            Start free or scale to custom pipelines for enterprise macro research teams.
          </p>

          {/* Billing Switch */}
          <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                billingPeriod === 'monthly' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-400'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                billingPeriod === 'yearly' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-400'
              }`}
            >
              Yearly billing
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1 */}
          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex flex-col justify-between shadow-sm relative">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Free Sandbox</span>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white mt-1">Free Tier</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Foundational limits for testing macroeconomic data flows.
              </p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-950 dark:text-white">$0</span>
                <span className="text-xs text-slate-500">/ forever</span>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>100 queries / month limit</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>Standard dashboard visualization</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => router.push('/register?plan=free')}
              className="mt-8 w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors text-slate-800 dark:text-slate-200"
            >
              Get Started Free
            </button>
          </div>

          {/* Plan 2 - Featured */}
          <div className="p-8 rounded-3xl border-2 border-indigo-500 bg-white dark:bg-slate-900/50 flex flex-col justify-between shadow-xl relative scale-100 md:scale-105">
            <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider">
              Popular Choice
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Professional Analytics</span>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white mt-1">Pro Analyst</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Advanced forecasting, API credentials, and extended limits.
              </p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-950 dark:text-white">
                  ${billingPeriod === 'monthly' ? '49' : '39'}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white">1,000 queries / month limit</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>Developer API Keys access</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>Email & Discord support integration</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => router.push('/register?plan=pro')}
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm transition-all duration-300 shadow-md shadow-indigo-500/10"
            >
              Subscribe to Pro
            </button>
          </div>

          {/* Plan 3 */}
          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 flex flex-col justify-between shadow-sm relative">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enterprise Console</span>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white mt-1">Enterprise</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Dedicated forecasting engines and custom SHAP models weights.
              </p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-950 dark:text-white">
                  ${billingPeriod === 'monthly' ? '499' : '399'}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white">Unlimited queries / month</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>Custom LSTM training weights</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>SLA uptime & dedicated manager</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => router.push('/register?plan=enterprise')}
              className="mt-8 w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors text-slate-800 dark:text-slate-200"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white">
            Analyst Reviews
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base">
            Read what quantitative researchers say about the GeoCap-X forecasting framework.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
              &ldquo;The SHAP explainable models allowed our risk committees to quickly audit the exact factors driving predictive inflows during the Q2 trade shifts.&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-500">
                MD
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-white">Marcus Devore</h4>
                <p className="text-[10px] text-slate-400">Principal Quantitative Researcher, Global Risk</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
              &ldquo;GeoCap-X has mapped FX and index correlations better than any benchmark package we tested. Highly recommended for multi-tenant analytical teams.&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-violet-500">
                SC
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-white">Sarah Chen</h4>
                <p className="text-[10px] text-slate-400">Head of FX Strategy, Nexus Macro Fund</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
              &ldquo;API key automation works smoothly. The rate limits and performance latency levels are stable even under global data feeds stress tests.&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-emerald-500">
                AR
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-white">Alexander Ross</h4>
                <p className="text-[10px] text-slate-400">Lead Systems Engineer, FinTech Labs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white">
            Frequently Asked Queries
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Everything you need to know about access permissions and models attributions.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'How does the explainable SHAP AI model calculate attribution?',
              a: 'Our modeling pipelines evaluate input perturbations (macro rates, commodity index variables) to assign Shapley values that indicate exactly which metrics drove net flows directional weights.'
            },
            {
              q: 'Can we configure developer API keys to integrate custom scripts?',
              a: 'Yes, Pro and Enterprise tier plans allow you to generate hashed developer keys inside the dashboard console, matching standard REST headers.'
            },
            {
              q: 'Is multi-device session management active globally?',
              a: 'Every time you authenticate, a Session row tracks active logins. Users can terminate any active device session from their profile dashboard.'
            }
          ].map((faq, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-100/50 dark:hover:bg-slate-900/20 focus:outline-none"
              >
                <span className="font-bold text-sm text-slate-950 dark:text-white">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {expandedFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-6 pb-6 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/40 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 10. BLOG PREVIEW */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white">
            Macro Research Blog
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base">
            Read our quantitative strategy notes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden flex flex-col justify-between h-96 group">
            <div className="h-44 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border-b border-slate-200 dark:border-slate-800">
              <BarChart3 className="h-12 w-12 text-indigo-500 group-hover:scale-105 transition-transform" />
            </div>
            <div className="p-6 space-y-3 flex-grow">
              <span className="text-[10px] text-indigo-500 font-bold uppercase font-mono">Forecasting</span>
              <h3 className="text-base font-bold text-slate-950 dark:text-white line-clamp-2">LSTM Attributions on Global Balance of Payments</h3>
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                An analysis of recurrent sequences performance under volatile rate change cycles.
              </p>
            </div>
            <div className="px-6 pb-6 pt-2 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
              <span>Read article</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden flex flex-col justify-between h-96 group">
            <div className="h-44 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border-b border-slate-200 dark:border-slate-800">
              <Globe className="h-12 w-12 text-violet-500 group-hover:scale-105 transition-transform" />
            </div>
            <div className="p-6 space-y-3 flex-grow">
              <span className="text-[10px] text-violet-500 font-bold uppercase font-mono">Explainability</span>
              <h3 className="text-base font-bold text-slate-950 dark:text-white line-clamp-2">SHAP Values Applied to Global FX Capital Flows</h3>
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                Extracting exact variables attribution weights from complex multi-layered neural systems.
              </p>
            </div>
            <div className="px-6 pb-6 pt-2 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
              <span>Read article</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden flex flex-col justify-between h-96 group">
            <div className="h-44 bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 flex items-center justify-center border-b border-slate-200 dark:border-slate-800">
              <Layers className="h-12 w-12 text-emerald-500 group-hover:scale-105 transition-transform" />
            </div>
            <div className="p-6 space-y-3 flex-grow">
              <span className="text-[10px] text-emerald-500 font-bold uppercase font-mono">Infrastructure</span>
              <h3 className="text-base font-bold text-slate-950 dark:text-white line-clamp-2">Multi-tenant Architecture Security Standards</h3>
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                How we enforce organization data isolation limits across database models and API gateways.
              </p>
            </div>
            <div className="px-6 pb-6 pt-2 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
              <span>Read article</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 11. NEWSLETTER SIGNUP */}
      <section className="max-w-4xl mx-auto px-6 py-24 relative z-10 text-center">
        <div className="glass-panel p-10 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/20 space-y-6">
          <div className="inline-flex h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Subscribe to Macro Briefing
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-xs leading-relaxed">
            Get monthly reports detailing global capital flow shifts, attribution indices, and model performance backtesting directly to your inbox.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your work email"
              required
              className="flex-grow px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white transition-colors"
            />
            <button
              type="submit"
              disabled={isNewsletterSubmitting}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isNewsletterSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="border-t border-slate-200/60 dark:border-slate-900 bg-white/60 dark:bg-slate-950 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-sm text-slate-600 dark:text-slate-400">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                G
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white">
                GeoCap-X
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-normal max-w-xs">
              Next-generation long-horizon capital flow predictive forecasting engine built for quantitative macro research teams.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-950 dark:text-white text-xs uppercase tracking-wider">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-indigo-500 transition-colors">Features</a></li>
              <li><a href="#showcase" className="hover:text-indigo-500 transition-colors">Showcase</a></li>
              <li><a href="#pricing" className="hover:text-indigo-500 transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-950 dark:text-white text-xs uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-indigo-500 transition-colors">Help & FAQ</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">API Reference</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-950 dark:text-white text-xs uppercase tracking-wider">Security</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>ISO 27001 Compliant</span>
              </li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-500 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-200/50 dark:border-slate-800/40 text-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} GeoCap-X Analytics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
