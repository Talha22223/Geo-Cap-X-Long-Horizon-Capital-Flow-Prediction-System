# GEOCAP-X — Brutally Honest FYP Assessment

> Reviewed: Full codebase scan across `apps/ai`, `apps/api`, `apps/web`, `packages/`  
> Date: July 2026 | 1 month remaining

---

## The Brutal Truth Upfront

You have built an **impressive skeleton**. The architecture, file structure, and naming look like a senior engineer's work. But if your supervisor runs any module end-to-end right now, **most of it will produce zero real output**. At least **60–70% of the core logic is stubbed out returning empty arrays or hardcoded mock values**. The frontend is the most complete part, but it's entirely disconnected from the backend.

---

## ✅ What Is ACTUALLY Done (Genuinely Working)

### Python AI Service (`apps/ai`)
| Component | Status | Detail |
|-----------|--------|--------|
| **Technical Indicators Engine** | ✅ Real | `indicators.py` — 502 lines of pure-Python math. SMA, EMA, RSI, MACD, Bollinger, ATR, VWAP, OBV, ADX, Stochastic RSI, Ichimoku, Fibonacci, Volume Profile — all implemented from scratch, no TA-Lib dependency. **This is the best part of the whole project.** |
| **Market Data (Yahoo Finance)** | ✅ Real | `market_data.py` — `YahooFinanceMarketDataProvider` actually calls `yfinance`. Falls back to simulated on failure. |
| **Market Data (Simulated)** | ✅ Real | Deterministic seeded OHLCV generator. Works without any API key. |
| **SpaCy NLP Provider** | ✅ Real | `spacy_provider.py` — 449 lines. NER + VADER sentiment + keyword rules. Genuinely functional if `spacy` and `en_core_web_sm` are installed. |
| **Event Chain Builder** | ✅ Real | `builder.py` — Builds directed graphs using temporal proximity + shared entity overlap. Edge weights calculated. Topological depth assignment works. **Real logic, not fake.** |
| **SNA Analyzer** | ✅ Real | `analyzer.py` — Full NetworkX implementation. Degree, Betweenness, Closeness, Eigenvector, PageRank, HITS, Louvain community detection, Clustering Coefficient. Has a pure NumPy PageRank fallback. **Genuinely impressive.** |
| **Capital Flow Engine** | ✅ Mostly Real | `engine.py` — Rule-based inference with weighted directional logic per category. Generates 4-horizon predictions. Evidence + scenario tables. Logic is heuristic but defensible. |
| **Ingestion Pipeline Orchestrator** | ✅ Real | `pipeline.py` — 11-step pipeline wiring: Fetch → Normalize → Deduplicate → NLP → Store → EventChain → SNA → CapitalFlow. The orchestration is complete. |
| **Deduplicator** | ✅ Real | `deduplicator.py` — Multi-strategy: hash, external ID, semantic similarity checks. |
| **Market Structure Detection** | ✅ Real | `market_structure.py` — Swing highs/lows, S/R levels, breakout detection. |
| **Pattern Recognition** | ✅ Real | `patterns.py` — 13+ KB of chart pattern logic. |
| **Database Schema** | ✅ Real | Prisma schema (~26KB) with full relational model. SQLAlchemy models exist. |
| **Unit Tests** | ✅ Exist | 10 test files covering major modules. |

### Frontend (`apps/web`)
| Component | Status | Detail |
|-----------|--------|--------|
| **Technical Analysis Page** | ✅ Works (Mock) | Candlestick chart, sub-charts (RSI/MACD/Volume/ADX), symbol/timeframe switcher, indicator toggles, patterns panel, MTF alignment, AI explanation panel — **all rendered beautifully with mock data** |
| **Dashboard Page** | ✅ Works (Mock) | Stat cards, quick actions, trending sectors, activity feed, economic events. Polished UI. |
| **UI Component Library** | ✅ Real | Buttons, inputs, sidebar, navigation, modals — built. |
| **Auth System** | ✅ Structure Exists | NestJS auth module exists. Zustand auth store on frontend. |

---

## ❌ What Is STUBBED / FAKE (Looks Done, Returns Nothing)

This is the part that will kill you in a demo.

### 🔴 CRITICAL — These return empty arrays RIGHT NOW

| File | What It Claims | What It Actually Does |
|------|---------------|----------------------|
| `ingestion/sources/newsapi.py` | "Fetches live news" | `return []` — literally does nothing |
| `ingestion/sources/fred.py` | "FRED economic data" | `return []` — stub |
| `ingestion/sources/gdelt.py` | "Global events DB" | `return []` — stub |
| `ingestion/sources/yahoo_finance.py` (ingestion) | "Finance news" | `return []` — stub |
| `ingestion/sources/kafka_stream.py` | "Real-time stream" | `return []` — stub |
| `providers/openai_provider.py` | "GPT-4o extraction" | Returns hardcoded 0.5 confidence, empty arrays |
| `providers/finbert_provider.py` | "FinBERT sentiment" | Returns NEUTRAL 0.5 always — stub |
| `providers/gemini_provider.py` | "Gemini NLP" | Returns NEUTRAL 0.5 always — stub |

**The only real data sources are:** `rss.py`, `seed.py`, `manual_entry.py`, `csv_upload.py`, `json_upload.py`, `world_bank.py`

### 🔴 CRITICAL — Frontend is 100% Disconnected from Backend

Every single data hook on the frontend returns mock data:

| Hook | What It Should Do | What It Actually Does |
|------|------------------|----------------------|
| `useDashboardStats.ts` | Fetch live stats from API | Returns hardcoded `MOCK_STATS` (`$2.84T`, `89.4% accuracy`) — FAKE |
| `useRecentActivity.ts` | Fetch real activity | Mock data with 300ms fake delay |
| `useEconomicEvents.ts` | Real economic calendar | Mock events |
| `usePredictions.ts` | Real AI predictions | Mock predictions |
| `useReports.ts` | Real reports | Mock reports |
| `technical/page.tsx` (line 102) | Comment literally says: | `// replace with useTechnicalAnalysis hook when API live` |

The `useTechnicalAnalysis` hook **IS written** (connects to `http://localhost:8000`) but the **page doesn't use it** — it uses `generateMockOHLCV()` instead.

### 🟡 PARTIAL — Exists but Unverified/Untested End-to-End

| Component | Issue |
|-----------|-------|
| NestJS API (`apps/api`) | Auth, profile, organizations, subscriptions all exist — but **no routes serve real AI data to the frontend** (no `/api/capital-flow`, no `/api/events` wired to the Python service) |
| Capital Flow Page (`/flows`) | Exists but likely still mock |
| Predictions Page (`/predictions`) | Exists but uses `mockPredictions.ts` |
| Visualizations (Heatmap, Sankey, Event Graph) | The `charts.tsx` component exists (10KB) — but not confirmed live |
| Event Chain Visualization | Page exists (`/events`) but data source unknown |
| RSS Source | `rss.py` has real parsing code — but needs URLs configured |
| World Bank Source | `world_bank.py` has real HTTP calls — needs testing |

---

## 🚫 What Is Completely Missing (From Proposal, Not in Codebase)

| Promised Feature | Reality |
|----------------|---------|
| **Long-Term Market Evolution Model (6mo–5yr)** | `horizons.py` exists (987 bytes) — just does magnitude scaling math, no actual temporal modeling |
| **Sankey Diagram (Capital Rotation Flow)** | Shown in mockup, not confirmed implemented |
| **Capital Flow Heatmap** | Shown in mockup, not confirmed live with real data |
| **Real-time data pipeline** | Kafka stub returns `[]`, no live stream |
| **Explainability Narrative Engine** | `explainer.py` exists in capital_flow + technical, but generates template strings, not LLM reasoning |
| **Historical backtesting / validation** | Hardcoded: `{"year": 2022, "event": "Fed rate hiking cycle", "similarity_score": 0.78}` — one fake record in the code |
| **Model Accuracy metric (89.4%)** | Hardcoded in `useDashboardStats.ts` — this number is invented |

---

## 📊 Honest Completion Score by Module

| Module | Code Exists | Actually Works | Produces Real Data |
|--------|-------------|----------------|-------------------|
| Technical Indicators (Python) | ✅ | ✅ | ✅ (with yfinance) |
| Event Chain Builder | ✅ | ✅ | ⚠️ (only if events in DB) |
| SNA Analyzer | ✅ | ✅ | ⚠️ (only if events in DB) |
| Capital Flow Engine | ✅ | ✅ | ⚠️ (only if events in DB) |
| NLP (SpaCy) | ✅ | ✅ | ✅ (needs spacy install) |
| Data Ingestion Sources | ✅ | ❌ | ❌ (all stubs except RSS/seed) |
| NestJS API ↔ AI Bridge | ⚠️ Partial | ❌ | ❌ (not wired) |
| Frontend ↔ Backend | ✅ hooks exist | ❌ | ❌ (all mocked) |
| Dashboard | ✅ | ✅ (UI only) | ❌ (fake numbers) |
| Technical Page | ✅ | ✅ (UI only) | ❌ (mock OHLCV) |
| Capital Flow Heatmap | ⚠️ | ❓ | ❌ |
| Event Chain Graph | ⚠️ | ❓ | ❌ |
| Auth System | ✅ | ⚠️ Untested | ❓ |

**Overall: ~35% actually working end-to-end. ~60% scaffolded/mocked.**

---

## 🎯 1-Month Priority Action Plan

You have 4 weeks. Here is the **exact order** to work in:

### Week 1 — Make the pipeline produce real data (MUST DO FIRST)
1. **Wire RSS source** — configure 5-10 real financial news RSS feeds (Reuters, BBC Business, FT). Test `pipeline.run("rss")` produces real events in the database.
2. **Wire World Bank source** — test `world_bank.py` fetches GDP, inflation data. Seed the DB.
3. **Wire yfinance into the technical API** — the Python FastAPI at `apps/ai/api/` must call `YahooFinanceMarketDataProvider` and return real OHLCV data via `/api/v1/technical/{symbol}`.
4. **Remove all stub ingestion sources from Week 1 demo** — don't pretend they work.

### Week 2 — Connect frontend to real Python API
1. **Replace `generateMockOHLCV` in `technical/page.tsx`** with `useTechnicalAnalysis` hook (already written, just not connected).
2. **Replace `MOCK_STATS` in `useDashboardStats.ts`** with real NestJS API call that aggregates from the Python service.
3. **Wire predictions page** to `usePredictions.ts` with real capital flow predictions from the database.
4. **Test the full flow**: News RSS → SpaCy NLP → EventChain → SNA → CapitalFlow predictions → Frontend display.

### Week 3 — Make visualizations real
1. **Event Chain graph** — serve `EventChain` data from API, render as interactive graph on frontend.
2. **Capital Flow Heatmap** — serve `CapitalFlowPrediction` data grouped by region/sector.
3. **Sankey Diagram** — use prediction data to build flow diagram.

### Week 4 — Polish + Demo preparation
1. Add seed data with 20–30 real news articles so the system has something to reason about on demo day.
2. Create a "demo mode" button that runs the full pipeline on a set of sample articles and shows live results.
3. Remove all hardcoded fake numbers (`89.4% accuracy`, `$2.84T`, etc.) — your supervisor may ask where those come from.
4. Prepare a slide showing the complete data flow: RSS → Python → DB → API → Frontend.

---

## Final Honest Verdict

**The good news:** Your architecture is solid. The technical indicators are genuinely impressive. The SNA module is real CS work. The event chain builder is real. If you wire the data through, this *can* be a genuinely working system in 1 month.

**The bad news:** Right now, if someone types a ticker into your technical chart, they see simulated random noise. If someone reads `$2.84T inflow` on the dashboard, that number was typed by hand. The entire end-to-end data flow is broken because the ingestion sources return empty arrays and the frontend doesn't talk to the backend.

**The risk:** If you demo this as-is and your supervisor asks "where does this data come from?", the honest answer for most screens is "we made it up." That's an FYP failure.

**The path forward is clear.** Focus 100% on Week 1 and Week 2 tasks. Get one real end-to-end flow working: **one real news source → NLP → EventChain → CapitalFlow → visible on dashboard**. That single working demo is worth more than 10 beautifully styled pages with fake data.
