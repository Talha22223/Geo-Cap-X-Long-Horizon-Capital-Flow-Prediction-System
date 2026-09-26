# GeoCap-X Enterprise Capital Flow Prediction Platform
## Technical Master Documentation & System Architecture Manual

> **Document Type:** Production Technical Architecture Specification  
> **Target Audience:** Technical Evaluators, Panel Reviewers, System Architects, Full-Stack Engineers  
> **Version:** 1.0.0 Enterprise Production  
> **Last Verified Date:** September 2026  
> **Monorepo Root:** `d:/Long Horizon Capital Flow Prediction System`

---

## 1. System Overview

### 1.1 What is GeoCap-X?
**GeoCap-X** is an enterprise-grade quantitative forecasting and macroeconomic intelligence platform engineered for long-horizon cross-border capital flow predictions, geopolitical event extraction, causality network graph visualization, statistical abnormality detection, and point-in-time backtesting.

### 1.2 Primary Purpose & Problem Solved
Traditional macroeconomic forecasting relies on lagging economic indicators (GDP, CPI reports released quarterly or monthly) and static regression models that fail to capture sudden geopolitical disruptions (sanctions, military conflicts, regulatory embargoes, trade pacts). GeoCap-X bridges qualitative geopolitical intelligence with quantitative financial verification by:
1. **Automated Event Ingestion & NLP Extraction**: Ingesting global news, RSS feeds, GDELT, and legislative disclosures in real-time, extracting canonical entities (countries, sectors, commodities, severity, and sentiment).
2. **Causal Network Propagation (SNA)**: Modeling international geopolitical and supply-chain linkages using graph algorithms (PageRank, Betweenness Centrality, Degree Centrality, Eigenvector Centrality).
3. **Statistical Abnormality & Market Confirmation**: Comparing extracted event windows against real financial market time series (via Yahoo Finance, FRED, World Bank) to compute baseline standard deviations and Z-score volume/volatility anomalies.
4. **Multi-Horizon Rotation Forecasting**: Forecasting directional capital rotations (Inflows vs. Outflows in billions USD) across 6-Month, 1-Year, 3-Year, and 5-Year horizons with Bayesian scenario probabilities.
5. **10-Tier Explainable AI (XAI) & Audit Provenance**: Answering institutional compliance and regulatory scrutiny through mathematical confidence decompositions and verifiable 10-stage data lineage chains.

### 1.3 Target Users & Personas
* **Macro Hedge Fund Portfolio Managers**: Detecting sector and sovereign capital rotations before quarterly balance of payments disclosures.
* **Institutional Risk Officers**: Evaluating multi-order geopolitical exposure to critical choke-points and bilateral sanctions.
* **Quantitative Researchers & Economists**: Backtesting point-in-time models against historical crises (e.g., 2014 Crimea, 2018 US-China Tariffs, 2022 Russian Sanctions, 2023 Red Sea Disruptions).
* **Enterprise Administrators & Compliance Auditors**: Governing organizational workgroups, auditing data access logs, and managing developer API credentials.

### 1.4 High-Level Module Architecture
The system is constructed as a distributed monorepo comprising three core operational tiers:
* **Presentation Tier (`apps/web`)**: Next.js 15 App Router web application providing low-latency financial visualizations, interactive network graphs, technical analysis charts, and billing management.
* **Gateway & Governance Tier (`apps/api`)**: NestJS 10 API Gateway coordinating authentication, RBAC, tenant organization isolation, Stripe subscription billing, rate limiting, and reverse-proxying.
* **Intelligence & Model Tier (`apps/ai`)**: Python 3.11/3.14 FastAPI engine housing statistical algorithms, NLP provider adapters, social network analysis (NetworkX), time-series baseline evaluators, and the multi-horizon forecasting pipeline.

---

## 2. Technology Stack

GeoCap-X strictly employs technologies actually implemented within the repository codebase:

| Component Tier | Technology / Library | Version | Purpose in System |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | 15.0.3 | Server-rendered pages, edge routing middleware, SEO optimization |
| **Frontend UI Library** | React | 19.0.0-rc | Reactive view component hierarchy |
| **Styling & Design** | Tailwind CSS | 3.4.1 | Glassmorphism, institutional dark theme, responsive grid systems |
| **Icons & Visuals** | Lucide React | ^0.460.0 | High-density financial and navigational iconography |
| **Animations** | Framer Motion | ^11.11.17 | Micro-animations, page transitions, modal spring physics |
| **Data Fetching & Cache** | TanStack React Query | ^5.62.0 | Asynchronous query caching, background polling, mutation sync |
| **State Management** | Zustand | ^5.0.1 | Client state (Auth session, Active workspace, Watchlist, Theme) |
| **HTTP Client** | Axios | ^1.7.9 | HTTP client with automatic Bearer JWT injection interceptors |
| **Backend Framework** | NestJS | 10.0.0 | Enterprise API Gateway, module dependency injection, Swagger OpenAPI |
| **Backend Runtime** | Node.js | >=20.x | Gateway execution environment |
| **Password Hashing** | Argon2 / Crypto | 0.41.1 | Memory-hard cryptographic password hashing |
| **Token Authentication** | Passport JWT | 10.0.0 / 0.5.20 | Stateless JSON Web Token session validation |
| **API Validation** | Class-Validator & Zod | 0.14.1 / 3.23.8 | DTO payload whitelisting, sanitization, and environment parsing |
| **Security Headers** | Helmet | ^8.0.0 | Content Security Policy (CSP), HSTS, frame protection |
| **Rate Limiting** | NestJS Throttler | ^6.3.0 | IP-based request throttling against denial-of-service |
| **Payment Provider** | Stripe Node SDK | ^17.5.0 | Hosted Checkout sessions, billing portal, and webhook handling |
| **Database ORM (Node)** | Prisma Client | 5.22.0 | Type-safe PostgreSQL client for Gateway multi-tenancy & billing |
| **AI Framework** | FastAPI | 0.115.6 | Asynchronous Python microservice framework with auto-OpenAPI |
| **AI Runtime** | Python | >=3.11 (3.14) | Numerical algorithms and NLP pipeline runtime |
| **Database ORM (Python)** | SQLAlchemy (asyncpg) | 2.0.36 | Asynchronous PostgreSQL connection pooling in AI engine |
| **Database Migrations** | Alembic | 1.14.0 | Relational database schema migrations for AI models |
| **Relational Database** | PostgreSQL | 15 (Alpine) | ACID primary storage for users, orgs, events, and observations |
| **In-Memory Cache & Queue**| Redis & ioredis | 7 / 5.4.1 | Task job queue, rate limiter backing, and SNA graph cache |
| **Numerical Processing** | NumPy & SciPy | 2.2.0 / 1.14.1 | Matrix operations, Z-score computation, standard deviation |
| **Data Manipulation** | Pandas | 2.2.3 | Time series alignment and chronological event-windowing |
| **Graph Network Analysis** | NetworkX | 3.4.2 | Graph centrality: PageRank, Betweenness, Degree, Eigenvector |
| **NLP & Sentiment** | SpaCy & VaderSentiment| 3.8.3 / 3.3.2 | Named Entity Recognition (NER), linguistic parsing, sentiment polarity |
| **Market Data Ingestion** | yfinance | 0.2.50 | Automated historical OHLCV market observation ingestion |
| **Containerization** | Docker & Compose | 3.8 Spec | Multi-container production deployment orchestration |
| **Reverse Proxy** | NGINX | Alpine | SSL termination, gzip compression, request routing |

---

## 3. Project Architecture

### 3.1 End-to-End System Communication Flow
```mermaid
flowchart TD
    User([Institutional User / Browser])
    
    subgraph Frontend ["Next.js 15 Web Client (:3000)"]
        Middleware["Edge Middleware (middleware.ts)"]
        Pages["App Router Pages (/dashboard, /predictions, /plans)"]
        AuthG["AuthGuard & SubscriptionGate Components"]
        Zustand["Zustand Stores (authStore, watchlistStore)"]
        AxiosClient["Axios HTTP Client (apiClient.ts)"]
    end

    subgraph Gateway ["NestJS API Gateway (:3001)"]
        MainGateway["Bootstrap & Security Pipes (Helmet, XSS, Throttler)"]
        AuthMod["AuthModule (Argon2, JWT, Google OAuth)"]
        SubsMod["SubscriptionsModule (Stripe Provider, Plans, Webhooks)"]
        AiMod["AiModule (Proxy Client to Python AI)"]
        OrgMod["OrganizationsModule (Multi-Tenant Workgroups)"]
        AdminMod["AdminModule (Governance, Audit Logs, Flags)"]
        PrismaService["Prisma ORM Service"]
    end

    subgraph AIService ["FastAPI AI Microservice (:8000)"]
        FastAPIRouter["API V1 Router (api/v1/router.py)"]
        IngestPipe["Ingestion Pipeline & Deduplicator"]
        SNAEngine["SNA & Graph Network Analyzer (NetworkX)"]
        CapFlowEngine["Capital Flow Engine & Horizon Aggregator"]
        Explainer["Unified 10-Tier Explainability Engine"]
        TechnicalEngine["Technical Indicator & SMC Engine"]
        SQLAlchemyAsync["SQLAlchemy Async Engine (asyncpg)"]
    end

    subgraph Datastores ["Persistence & Infrastructure"]
        Postgres[(PostgreSQL 15 Database)]
        Redis[(Redis 7 Cache & Job Queue)]
        StripeAPI["Stripe Cloud Infrastructure"]
        FinancialAPIs["Financial Feeds (Yahoo Finance, FRED, Congress)"]
    end

    User -->|HTTPS Request| Middleware
    Middleware --> Pages
    Pages --> AuthG
    AuthG --> Zustand
    Pages --> AxiosClient
    
    AxiosClient -->|Bearer JWT / Cookies| MainGateway
    MainGateway --> AuthMod
    MainGateway --> SubsMod
    MainGateway --> AiMod
    MainGateway --> OrgMod
    MainGateway --> AdminMod

    AuthMod --> PrismaService
    SubsMod --> PrismaService
    SubsMod <-->|Stripe REST API| StripeAPI
    OrgMod --> PrismaService
    AdminMod --> PrismaService
    PrismaService -->|SQL Connection Pool| Postgres
    MainGateway -->|Queue & Cache| Redis

    AiMod -->|Internal HTTP Proxy :8000| FastAPIRouter
    FastAPIRouter --> IngestPipe
    FastAPIRouter --> SNAEngine
    FastAPIRouter --> CapFlowEngine
    FastAPIRouter --> Explainer
    FastAPIRouter --> TechnicalEngine
    
    CapFlowEngine <-->|Historical OHLCV| FinancialAPIs
    IngestPipe <-->|Event Ingestion| FinancialAPIs
    FastAPIRouter --> SQLAlchemyAsync
    SQLAlchemyAsync -->|SQL Async Pool| Postgres
    FastAPIRouter <-->|Graph Cache & Jobs| Redis
```

---

## 4. Complete Project Structure

```
d:/Long Horizon Capital Flow Prediction System/
├── .env                              # Master environment template & root credentials
├── .env.example                      # Reference environment variable specifications
├── docker-compose.yml                # Production multi-container composition (Web, API, AI, DB, Redis, NGINX)
├── package.json                      # Monorepo NPM workspace configuration
├── SYSTEM_DOCUMENTATION.md           # [THIS FILE] Authoritative technical master documentation
│
├── apps/
│   ├── api/                          # NestJS 10 API Gateway Application (Port 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Definitive PostgreSQL database schema (20+ entities)
│   │   │   └── seed.ts               # Database seeder (plans, users, mock telemetry)
│   │   ├── src/
│   │   │   ├── main.ts               # Gateway bootstrap, Helmet, CORS, Swagger setup
│   │   │   ├── app.module.ts         # Root DI module, Zod environment validation, Throttler setup
│   │   │   ├── admin/                # Admin controller, service, telemetry, audit log inspection
│   │   │   ├── ai/                   # Reverse-proxy forwarding calls to FastAPI AI engine
│   │   │   ├── apikeys/              # SHA-256 hashed programmatic API key generation & validation
│   │   │   ├── auth/                 # Argon2 hashing, JWT signing, refresh token rotation, Google OAuth
│   │   │   ├── common/               # Guards (RBAC, SubscriptionGate), interceptors, pipes, logger
│   │   │   ├── database/             # Prisma service connection lifecycle
│   │   │   ├── health/               # Comprehensive diagnostics (/health: DB, Redis, AI, Memory)
│   │   │   ├── organizations/        # Multi-tenant workgroup management, member roles, invitations
│   │   │   ├── profile/              # User account profiles, preferences, active session invalidation
│   │   │   ├── reports/              # Custom report bookmarking and CSV export engine
│   │   │   └── subscriptions/        # Stripe provider, checkout sessions, customer portal, webhooks
│   │   └── test/                     # End-to-end integration test suites (Supertest)
│   │
│   ├── ai/                           # Python FastAPI AI & Quantitative Forecasting Engine (Port 8000)
│   │   ├── main.py                   # FastAPI application initialization, lifespan, CORS, error handling
│   │   ├── config.py                 # Pydantic BaseSettings environment parsing & connection validation
│   │   ├── api/v1/                   # FastAPI endpoint sub-routers:
│   │   │   ├── router.py             # Master sub-router aggregator
│   │   │   ├── predictions.py        # Capital flow prediction queries & generation
│   │   │   ├── forecast.py           # Multi-horizon forecast engine routes
│   │   │   ├── backtest.py           # Point-in-time backtesting & leakage testing routes
│   │   │   ├── explain.py            # 10-stage traceability and trust questions endpoint
│   │   │   ├── sna.py                # Graph centrality metrics (PageRank, Betweenness)
│   │   │   ├── technical.py          # Multi-timeframe indicator & SMC pattern routes
│   │   │   ├── market.py             # Market observations & event asset mapping
│   │   │   ├── market_intelligence.py# 4-layer fused signal intelligence
│   │   │   ├── events.py             # Extracted geopolitical event queries
│   │   │   └── dashboard.py          # High-level aggregate statistics
│   │   ├── capital_flow/             # Quantitative forecasting algorithms:
│   │   │   ├── engine.py             # CapitalFlowEngine (V6.1 real market integration)
│   │   │   ├── multi_horizon.py      # Multi-horizon forecast model coordinator
│   │   │   ├── horizons.py           # Mathematical decay & rotation scaling functions
│   │   │   ├── abnormality.py        # Statistical standard deviation & Z-score abnormality
│   │   │   ├── event_mapping.py      # Event-to-instrument asset mapping heuristics
│   │   │   ├── event_window.py       # Pre/Post event window statistical baseline analyzer
│   │   │   ├── backtest_engine.py    # Historical walk-forward backtest reconstructor
│   │   │   ├── leakage_tester.py     # Future-information lookahead leakage detector
│   │   │   ├── signal_fusion.py      # 4-layer signal fusion scorer
│   │   │   └── unified_explainer.py  # 10-tier provenance & auditability engine
│   │   ├── event_chain/              # Causal propagation & graph construction:
│   │   │   ├── graph.py              # In-memory graph builder
│   │   │   ├── propagation.py        # Multi-hop causal shock propagation engine
│   │   │   └── path_analysis.py      # Shortest & most impactful causal chain identification
│   │   ├── sna/                      # NetworkX Social Network Analysis centrality analyzer
│   │   ├── technical/                # Market structure, order blocks, indicators (RSI, MACD, OBV)
│   │   ├── ingestion/                # Multi-source ingest adapters (GDELT, NewsAPI, RSS, Yahoo, Congress)
│   │   ├── providers/                # NLP model adapters (FinBERT, SpaCy, OpenAI, Gemini, Stubs)
│   │   ├── models/                   # SQLAlchemy ORM models matching PostgreSQL tables
│   │   └── workers/                  # Redis-backed asynchronous background job processor
│   │
│   └── web/                          # Next.js 15 App Router Frontend Application (Port 3000)
│       ├── src/
│       │   ├── middleware.ts         # Edge route protection, bfcache prevention, cookie inspection
│       │   ├── app/
│       │   │   ├── layout.tsx        # Root HTML layout, ThemeProvider, QueryClientProvider
│       │   │   ├── page.tsx          # Institutional public landing & feature demonstration
│       │   │   ├── plans/page.tsx    # Plan pricing tier selection & Stripe checkout launcher
│       │   │   ├── (auth)/           # Authentication routes:
│       │   │   │   ├── login/page.tsx   # Login screen with Remember Me & Google OAuth
│       │   │   │   └── register/page.tsx# Registration screen with password strength validation
│       │   │   ├── (dashboard)/      # Protected workspace pages (wrapped in AuthGuard):
│       │   │   │   ├── dashboard/page.tsx     # Command center overview & telemetry
│       │   │   │   ├── predictions/page.tsx   # Long-horizon forecast tables & filters
│       │   │   │   ├── flows/page.tsx         # Cross-border capital rotation sankey/flows
│       │   │   │   ├── market/page.tsx        # Real-time asset observations & abnormal signals
│       │   │   │   ├── technical/page.tsx     # Candlestick charts & SMC indicators
│       │   │   │   ├── visualizations/page.tsx# Interactive NetworkX causality graph visualizer
│       │   │   │   ├── validation/page.tsx    # Point-in-time backtest & leakage test panel
│       │   │   │   ├── events/page.tsx        # Geopolitical event extraction feed
│       │   │   │   ├── reports/page.tsx       # Custom report generation & CSV export
│       │   │   │   ├── admin/page.tsx         # User governance & system telemetry
│       │   │   │   └── billing/page.tsx       # Stripe billing management & portal link
│       │   │   └── subscription/
│       │   │       └── success/page.tsx       # Stripe return handler & synchronous plan activator
│       │   ├── components/           # Reusable institutional UI components:
│       │   │   ├── auth/AuthGuard.tsx         # Session & active subscription verification wrapper
│       │   │   ├── subscription/subscription-gate.tsx # Visual paywall gate for Pro/Enterprise features
│       │   │   ├── dashboard/top-nav.tsx      # Breadcrumbs, search, user menu, status badges
│       │   │   ├── dashboard/sidebar.tsx      # Collapsible navigation sidebar
│       │   │   └── technical/CandlestickChart.tsx # Financial chart canvas
│       │   └── lib/
│       │       ├── api-client.ts              # Axios instance with Bearer JWT injection
│       │       ├── store/authStore.ts         # Zustand single source of truth for auth & subscription
│       │       └── hooks/usePredictions.ts    # React Query hooks for fetching forecasts
│       │
├── packages/
│   ├── shared/                       # Shared TypeScript definitions & schemas (@geocap-x/shared)
│   │   ├── src/types/auth.ts         # SystemRole, OrgRole, UserPermission enums
│   │   └── src/schemas/auth.ts       # Zod validation schemas
│   ├── ui/                           # Shared atomic UI components (Button, Card, Dialog, Table)
│   └── config/                       # Base TypeScript and ESLint configuration templates
│
└── docker/                           # Production deployment artifacts
    ├── api.Dockerfile                # Multi-stage production container for NestJS Gateway
    ├── ai.Dockerfile                 # Production container for Python FastAPI AI engine
    ├── web.Dockerfile                # Production standalone container for Next.js 15
    └── nginx.conf                    # Reverse proxy routing rules and SSL parameters
```

---

## 5. File-to-Function Map

| Area | File Path | Primary Purpose | Key Functions / Classes |
| :--- | :--- | :--- | :--- |
| **Gateway Bootstrap** | `apps/api/src/main.ts` | Initializes Gateway, applies Helmet, CORS, and Swagger | `bootstrap()` |
| **DI Root** | `apps/api/src/app.module.ts` | Orchestrates modules, validates env with Zod, sets rate limit | `AppModule`, `envSchema` |
| **Authentication Flow** | `apps/api/src/auth/auth.controller.ts` | Exposes login, register, OAuth, refresh, logout HTTP endpoints | `register()`, `login()`, `logout()`, `refresh()`, `getMe()`, `googleCallback()` |
| **Auth Business Logic** | `apps/api/src/auth/auth.service.ts` | Argon2 hashing, tenant creation, JWT signing, refresh rotation | `register()`, `login()`, `logout()`, `getCurrentUser()`, `refresh()`, `handleGoogleCallback()` |
| **JWT Strategy** | `apps/api/src/auth/jwt.strategy.ts` | Validates JWT from header/cookie, extracts live subscription | `validate()` |
| **JWT Route Guard** | `apps/api/src/auth/jwt-auth.guard.ts` | Intercepts requests and enforces valid authentication | `JwtAuthGuard` |
| **Subscription Guard** | `apps/api/src/common/guards/subscription-gate.guard.ts` | Server-side enforcement of active status, tier minimum, and quotas | `canActivate()` |
| **RBAC Guard** | `apps/api/src/common/guards/rbac.guard.ts` | Enforces required SystemRole on administrative endpoints | `canActivate()` |
| **Subscriptions API** | `apps/api/src/subscriptions/subscriptions.controller.ts` | HTTP endpoints for plans, Stripe checkout, portal, and webhooks | `listPlans()`, `createCheckoutSession()`, `verifySession()`, `activateFree()`, `handleWebhook()` |
| **Billing Operations** | `apps/api/src/subscriptions/subscriptions.service.ts` | Checkout creation, webhook event processing, plan assignment | `createCheckoutSession()`, `verifyCheckoutSession()`, `activateFreePlan()`, `handleWebhook()`, `cancelSubscription()` |
| **Stripe Integration** | `apps/api/src/subscriptions/stripe.provider.ts` | Direct communication with Stripe API SDK | `createCheckoutSession()`, `verifyCheckoutSession()`, `constructWebhookEvent()`, `createPortalSession()` |
| **AI Gateway Proxy** | `apps/api/src/ai/ai.controller.ts` | Reverse proxies AI requests with tier-based capping (5 for Free) | `getPredictions()`, `getForecastByHorizon()`, `getEventChain()`, `runBacktest()` |
| **AI HTTP Client** | `apps/api/src/ai/ai.service.ts` | Low-level HTTP fetch dispatcher with 15s timeout handling | `fetchFromAi()` |
| **Multi-Tenancy** | `apps/api/src/organizations/organizations.controller.ts` | Organization creation, invitations, roster management | `create()`, `list()`, `addMember()`, `invite()`, `transfer()` |
| **Admin Operations** | `apps/api/src/admin/admin.controller.ts` | User governance, audit logs, feature flags, telemetry | `listUsers()`, `updateRole()`, `updateStatus()`, `listLogs()`, `getTelemetry()` |
| **API Key Engine** | `apps/api/src/apikeys/apikeys.service.ts` | Secure crypto API key generation and SHA-256 storage | `createKey()`, `listKeys()`, `revokeKey()`, `validateKey()` |
| **Database ORM** | `apps/api/src/database/prisma.service.ts` | Manages PostgreSQL connection lifecycle | `onModuleInit()`, `onModuleDestroy()` |
| **AI Entry Point** | `apps/ai/main.py` | FastAPI lifespan, table creation, CORS, and diagnostics | `lifespan()`, `health_check()` |
| **AI Configuration** | `apps/ai/config.py` | Pydantic BaseSettings loading and validating env variables | `Settings`, `validate_db_url()` |
| **Capital Flow Engine** | `apps/ai/capital_flow/engine.py` | V6.1 core prediction pipeline linking events to real market OHLCV | `generate_predictions_for_events()` |
| **Horizon Aggregator** | `apps/ai/capital_flow/horizons.py` | Scales rotation magnitudes across 6M, 1Y, 3Y, 5Y horizons | `scale_rotation()`, `get_decay_factor()` |
| **Statistical Baseline**| `apps/ai/capital_flow/abnormality.py` | Computes rolling mean, volatility, and Z-score abnormality | `calculate_z_score()`, `detect_abnormal_volume()` |
| **Event Windowing** | `apps/ai/capital_flow/event_window.py` | Analyzes pre-event and post-event market performance windows | `analyze_window()` |
| **Backtest Engine** | `apps/ai/capital_flow/backtest_engine.py` | Reconstructs point-in-time forecasts against historical events | `run_backtest()` |
| **Leakage Tester** | `apps/ai/capital_flow/leakage_tester.py` | Validates point-in-time timestamp strictness (no future lookahead) | `test_dataset_leakage()` |
| **Signal Fusion** | `apps/ai/capital_flow/signal_fusion.py` | Synthesizes 4 layers (Event, Network, Market, History) | `fuse_signals()` |
| **10-Tier Explainer** | `apps/ai/capital_flow/unified_explainer.py` | Generates 10-stage traceability chains and trust answers | `explain_event()`, `explain_forecast()` |
| **Graph Network (SNA)**| `apps/ai/sna/analyzer.py` | NetworkX calculations of PageRank, Betweenness, Centrality | `compute_centrality_metrics()`, `detect_communities()` |
| **Technical Engine** | `apps/ai/technical/engine.py` | Computes multi-timeframe indicators and SMC patterns | `analyze_market_structure()`, `calculate_indicators()` |
| **Edge Middleware** | `apps/web/src/middleware.ts` | Edge protection, cookie check, bfcache prevention headers | `middleware()` |
| **Client Auth Guard** | `apps/web/src/components/auth/AuthGuard.tsx` | React route protection checking session and plan status | `AuthGuard()` |
| **Subscription Gate** | `apps/web/src/components/subscription/subscription-gate.tsx`| Client visual paywall for Pro/Enterprise features | `SubscriptionGate()`, `handleSimulateStripePayment()` |
| **Auth State Store** | `apps/web/src/lib/store/authStore.ts` | Zustand single source of truth for auth & subscription info | `initAuth()`, `setAuth()`, `logout()`, `isSuperAdmin()`, `canAccessPro()` |
| **Axios API Client** | `apps/web/src/lib/api-client.ts` | Axios instance with Bearer JWT injection interceptor | `apiClient` |
| **Plans Selection** | `apps/web/src/app/plans/page.tsx` | Pricing cards and Stripe checkout launch page | `PlansContent()`, `handleSelectPlan()` |
| **Checkout Success** | `apps/web/src/app/subscription/success/page.tsx` | Confirms Stripe session ID and updates DB subscription | `verifyPayment()` |

---

## 6. Authentication & Authorization

### 6.1 Complete Authentication Lifecycle
```
User Registration:
  POST /api/v1/auth/register
  → Password verified against regex & confirmPassword
  → Password hashed via Argon2id (salt + memory-hard cost)
  → Database transaction: Creates User, Profile, UserSettings, Organization, OrganizationMember (OWNER), and Subscription (UNPAID)
  → Cryptographic session token and refresh token created in DB
  → Access Token (JWT) signed with user role & permissions
  → Returns accessToken + Sets 'refreshToken' (HttpOnly) & 'geocapx_auth_token' cookies
  → User redirected to /plans (UNPAID subscription prevents direct dashboard access)

User Login:
  POST /api/v1/auth/login
  → User looked up by email in PostgreSQL (deletedAt IS NULL check)
  → Argon2 password verification
  → Checks user.isActive (rejects suspended accounts)
  → Evaluates live Subscription status in DB (ACTIVE/TRIALING vs. UNPAID)
  → Generates Session & Refresh Token records
  → Returns accessToken + Sets cookies (7 days default, 30 days if rememberMe)
  → Redirects to /dashboard (if active sub) OR /plans (if unpaid)

Session & Protected Route Validation:
  Incoming Request (e.g. GET /api/v1/ai/predictions)
  → Checked by Next.js Edge Middleware (verifies auth cookie presence)
  → NestJS JwtAuthGuard triggers JwtStrategy
  → JwtStrategy extracts token from Bearer header or cookies
  → JwtStrategy.validate() looks up User and live Organization Subscription in PostgreSQL
  → Sets req.user = { id, email, role, permissions, organizationId, subscription }
  → SubscriptionGateGuard evaluates active status, tier minimum, and usage limits
  → Request reaches Controller Handler

User Logout:
  POST /api/v1/auth/logout
  → Refresh token marked isRevoked = true in DB
  → All active Sessions for userId set isActive = false
  → Set-Cookie clears 'refreshToken', 'geocapx_auth_token', and 'accessToken'
  → Audit log recorded: action = 'user.logout'
  → Frontend authStore.clearAuth() clears localStorage and triggers hard redirect to /login
```

### 6.2 Password Hashing Standard
Implemented in [`apps/api/src/common/utils/hash.util.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/common/utils/hash.util.ts):
* Utilizes **Argon2id** (the winning password hashing algorithm of the Password Hashing Competition) with configurable time cost, memory cost (64 MB), and parallelism.
* Salt is generated cryptographically per password hash to prevent rainbow table attacks.

### 6.3 Token Strategy & Storage
* **Access Token**: Short-lived JSON Web Token (JWT) signed with HMAC-SHA256 using `JWT_SECRET`. Contains `sub` (userId), `email`, `role`, and `permissions` array.
* **Refresh Token**: 40-byte cryptographically secure random hexadecimal string stored hashed in the `refresh_tokens` database table. Rotated on every single `/refresh` call (the old token is revoked; a new token is issued).
* **Cookie Configuration**:
  * `refreshToken`: `HttpOnly = true`, `SameSite = 'lax'`, `Secure = (NODE_ENV === 'production')`, `Path = '/'`.
  * `geocapx_auth_token`: Client-readable cookie enabling Next.js Edge Middleware route evaluation without requiring server database hits.

### 6.4 Role-Based & Fine-Grained Authorization
System Roles (defined in Prisma and shared packages):
* `SUPER_ADMIN`: Complete system access, bypasses all subscription paywalls, manages global settings and audit trails.
* `ADMIN`: Platform operations, user role updates, feature flags, telemetry inspection.
* `ANALYST`: Research read/write, forecast generation, backtest execution.
* `ENTERPRISE`: Institutional read access, custom API keys, leakage testing.
* `USER`: Base institutional client, subject to active subscription status.

Guards implemented:
* `JwtAuthGuard`: Enforces valid authentication token.
* `RolesGuard`: Enforces role hierarchy via `@Roles(...)` decorator.
* `PermissionsGuard`: Enforces granular capability permissions via `@RequirePermissions(...)`.
* `SubscriptionGateGuard`: Enforces active subscription status, minimum tier ('pro' | 'enterprise'), and numeric usage quotas.

---

## 7. Subscription & Payment System

### 7.1 Complete Billing Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor User as Institutional User
    participant Web as Next.js Web Client (/plans)
    participant Nest as NestJS API Gateway
    participant Stripe as Stripe Cloud API
    participant DB as PostgreSQL Database

    User->>Web: Selects Plan (Pro $129 / Enterprise $499)
    Web->>Nest: POST /api/v1/subscriptions/checkout-session { planId }
    Nest->>DB: Resolves User & Organization
    Nest->>Stripe: stripe.checkout.sessions.create({ line_items, metadata, success_url })
    Stripe-->>Nest: Returns { sessionId, url: "https://checkout.stripe.com/..." }
    Nest-->>Web: Returns { checkoutUrl, sessionId }
    Web->>User: Redirects to Stripe Hosted Checkout
    
    User->>Stripe: Enters Card (Test 4242...) & Completes Payment
    Stripe->>User: Redirects to return URL (/subscription/success?session_id=cs_test_...)
    
    par Synchronous Verification
        User->>Web: Lands on /subscription/success
        Web->>Nest: POST /api/v1/subscriptions/verify-session { sessionId }
        Nest->>Stripe: stripe.checkout.sessions.retrieve(sessionId)
        Stripe-->>Nest: Returns { status: "complete", payment_status: "paid" }
        Nest->>DB: Updates Subscription (status: ACTIVE, planId, 30 days period)
        Nest->>DB: Creates Invoice & Payment records
        Nest-->>Web: Returns { success: true, plan: "Pro", status: "ACTIVE" }
        Web->>Web: Re-hydrates useAuthStore
        Web->>User: Redirects to /dashboard with full unlocked access
    and Asynchronous Webhook Guarantee
        Stripe->>Nest: POST /api/v1/subscriptions/webhook [event: checkout.session.completed]
        Nest->>Nest: Validates STRIPE_WEBHOOK_SECRET signature
        Nest->>DB: Idempotent Subscription update
    end
```

### 7.2 Subscription Tier Matrix & Plan Specifications

The platform provides three distinct subscription plan tiers defined in PostgreSQL and seeded via [`apps/api/sync_plans.js`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/sync_plans.js):

| Plan Name | Price | Billing Interval | Entitlements & Features | System Quotas & Limits |
| :--- | :--- | :--- | :--- | :--- |
| **Free Sandbox** | $0.00 | Monthly (30-day) | Basic macro indicators, 1-Month horizon forecasts, top 5 predictions | `maxQueries: 100`<br>`allowApiKeys: false`<br>`maxOrganizations: 1` |
| **Pro Trader** | $129.00 | Monthly | 6-Month & 1-Year horizons, interactive SNA causality graph, full predictions feed, backtest engine | `maxQueries: 10,000`<br>`allowApiKeys: true`<br>`maxOrganizations: 3` |
| **Enterprise Quant**| $499.00 | Monthly | Full 3-Year & 5-Year horizons, information leakage testing, programmatic API keys, dedicated support | `maxQueries: -1 (Unlimited)`<br>`allowApiKeys: true`<br>`maxOrganizations: 10` |

### 7.3 Stripe Integration Implementation Details
* **Checkout Creation** ([`stripe.provider.ts:L31-L101`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/stripe.provider.ts#L31-L101)):
  Supports both pre-configured Stripe Price IDs (`price_...`) and dynamic on-the-fly recurring subscription line items (`price_data.recurring = { interval: 'month' }`). This guarantees instant functionality in any developer Stripe test mode environment without prior manual dashboard price creation.
* **Return Verification** ([`subscriptions.service.ts:L158-L275`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/subscriptions.service.ts#L158-L275)):
  Verifies that Stripe session status is `complete` and payment status is `paid`. Updates the organization's subscription record with a 30-day billing window, resets cancellation flags, generates database `Invoice` and `Payment` entities, and creates an audit trail entry.
* **Webhook Processor** ([`subscriptions.service.ts:L344-L451`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/subscriptions.service.ts#L344-L451)):
  Idempotently processes:
  * `checkout.session.completed`: Activates subscription.
  * `invoice.paid`: Extends subscription period end by 30 days.
  * `customer.subscription.updated`: Synchronizes status changes (active, trialing, past_due, canceled).
  * `customer.subscription.deleted`: Marks subscription as CANCELED.
* **Customer Portal** ([`stripe.provider.ts:L172-L190`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/stripe.provider.ts#L172-L190)):
  Launches the Stripe self-service billing management portal allowing clients to update credit cards, download invoices, or cancel their plans.
* **Free Plan Direct Activation** ([`subscriptions.service.ts:L278-L341`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/subscriptions.service.ts#L278-L341)):
  For users selecting the Free Sandbox tier, bypasses external payment processing and directly updates the organization subscription to `ACTIVE` in PostgreSQL.

---

## 8. Database Architecture

### 8.1 Database Technology
* **Engine**: PostgreSQL 15 running in containerized Alpine Linux.
* **Connection Pooling**:
  * Gateway: Managed by Prisma Client pool.
  * AI Service: Managed by SQLAlchemy AsyncEngine with `asyncpg` driver (`pool_size=10, max_overflow=20`).

### 8.2 Entity Relationship Map
```mermaid
erDiagram
    User ||--o| Profile : "has"
    User ||--o| UserSetting : "configures"
    User ||--o{ Session : "holds"
    User ||--o{ RefreshToken : "owns"
    User ||--o{ OrganizationMember : "participates"
    User ||--o{ ApiKey : "generates"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ SavedReport : "creates"
    
    Organization ||--o{ OrganizationMember : "contains"
    Organization ||--o{ Subscription : "subscribes"
    Organization ||--o{ OrganizationInvitation : "issues"
    
    SubscriptionPlan ||--o{ Subscription : "defines"
    Subscription ||--o{ Invoice : "bills"
    Invoice ||--o{ Payment : "receipts"
    
    RawEvent ||--o{ ExtractedEvent : "extracted_into"
    CanonicalEvent ||--o{ ExtractedEvent : "clusters"
    ExtractedEvent ||--o| EventChainNode : "represented_in_graph"
    EventChainNode ||--o{ EventChainEdge : "source_or_target"
    
    ExtractedEvent ||--o{ EventAssetMapping : "maps_to"
    ExtractedEvent ||--o{ EventWindowAnalysis : "analyzed_in"
    ExtractedEvent ||--o{ CapitalFlowPrediction : "generates"
    CapitalFlowPrediction ||--o{ AlternativeScenario : "projects"
    CapitalFlowPrediction ||--o{ PredictionEvidence : "supported_by"
    
    MarketObservation ||--o{ DerivedMarketIndicator : "derives"
```

### 8.3 Important Tables & Schemas

| Table Name | Primary Model | Primary Key | Critical Fields & Relationships |
| :--- | :--- | :--- | :--- |
| `users` | `User` | `id` (UUID) | `email`, `passwordHash`, `role`, `isActive`, `isEmailVerified` |
| `profiles` | `Profile` | `id` (UUID) | `userId` (FK to users), `firstName`, `lastName`, `avatarUrl` |
| `sessions` | `Session` | `id` (UUID) | `userId`, `token`, `isActive`, `expiresAt`, `ipAddress` |
| `refresh_tokens` | `RefreshToken` | `id` (UUID) | `userId`, `token`, `isRevoked`, `expiresAt` |
| `organizations` | `Organization` | `id` (UUID) | `name`, `slug` (unique), `deletedAt` |
| `organization_members`| `OrganizationMember`| `id` (UUID) | `organizationId`, `userId`, `role` (OWNER, ADMIN, MEMBER) |
| `subscription_plans` | `SubscriptionPlan` | `id` (UUID) | `name` (Free, Pro, Enterprise), `price`, `interval`, `features` (JSON) |
| `subscriptions` | `Subscription` | `id` (UUID) | `organizationId`, `planId`, `status` (ACTIVE, UNPAID), `stripeSubscriptionId`, `currentPeriodEnd` |
| `invoices` | `Invoice` | `id` (UUID) | `subscriptionId`, `stripeInvoiceId`, `amount`, `status` |
| `payments` | `Payment` | `id` (UUID) | `invoiceId`, `stripePaymentId`, `amount`, `status` |
| `api_keys` | `ApiKey` | `id` (UUID) | `userId`, `organizationId`, `keyHash` (SHA-256), `scopes` (JSON) |
| `audit_logs` | `AuditLog` | `id` (UUID) | `userId`, `action`, `resource`, `details` (JSON), `ipAddress`, `timestamp` |
| `raw_events` | `RawEvent` | `id` (UUID) | `source_type`, `title`, `body_raw`, `content_hash`, `published_at` |
| `extracted_events` | `ExtractedEvent` | `id` (UUID) | `raw_event_id`, `title`, `category`, `severity`, `sentiment`, `countries`, `sectors` |
| `canonical_events` | `CanonicalEvent` | `id` (UUID) | `cluster_hash`, `title`, `supporting_article_count` |
| `event_chain_nodes` | `EventChainNode` | `id` (UUID) | `event_id`, `degree_centrality`, `pagerank`, `betweenness_centrality` |
| `event_chain_edges` | `EventChainEdge` | `id` (UUID) | `source_node_id`, `target_node_id`, `weight`, `causal_relationship` |
| `capital_flow_predictions`| `CapitalFlowPrediction`| `id` (UUID) | `affected_country`, `direction` (INFLOW/OUTFLOW), `estimated_rotation_usd_bn`, `time_horizon`, `overall_confidence` |
| `market_observations`| `MarketObservation` | `id` (UUID) | `instrument_symbol`, `asset_class`, `timestamp`, `close_price`, `volume`, `data_origin` |
| `event_asset_mappings`| `EventAssetMapping` | `id` (UUID) | `event_id`, `instrument_symbol`, `asset_class`, `mapping_confidence` |
| `event_window_analyses`| `EventWindowAnalysis`| `id` (UUID) | `event_id`, `instrument_symbol`, `abnormality_z_score`, `signal_type` |

---

## 9. API Documentation

### 9.1 NestJS Gateway & AI Engine Endpoint Reference

| Method | Endpoint | Purpose | Auth Required | Enforcement / Guard | Primary Handler |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Provisions user account & personal tenant org | None (Public) | RateLimit (10/min) | `AuthController.register` |
| `POST` | `/api/v1/auth/login` | Validates credentials, issues JWT & cookies | None (Public) | RateLimit (10/min) | `AuthController.login` |
| `POST` | `/api/v1/auth/logout` | Revokes refresh tokens & clears auth cookies | None (Session) | `AuthService.logout` | `AuthController.logout` |
| `GET` | `/api/v1/auth/me` | Validates active session & live subscription | Bearer JWT | `JwtAuthGuard` | `AuthController.getMe` |
| `POST` | `/api/v1/auth/refresh` | Rotates single-use refresh token | None (Cookie) | `AuthService.refresh` | `AuthController.refresh` |
| `GET` | `/api/v1/auth/google/url` | Generates Google OAuth 2.0 consent URL | None (Public) | None | `AuthController.getGoogleUrl` |
| `POST` | `/api/v1/auth/google/callback` | Exchanges Google auth code for session | None (Public) | None | `AuthController.googleCallback` |
| `GET` | `/api/v1/subscriptions/plans`| Lists active subscription plan tiers | None (Public) | None | `SubscriptionsController.listPlans` |
| `GET` | `/api/v1/subscriptions/current`| Gets active plan, limits, and period status| Bearer JWT | `JwtAuthGuard` | `SubscriptionsController.getCurrentSubscription` |
| `POST` | `/api/v1/subscriptions/checkout-session`| Initiates Stripe session or activates Free | Bearer JWT | `JwtAuthGuard` | `SubscriptionsController.createCheckoutSession` |
| `POST` | `/api/v1/subscriptions/verify-session` | Confirms checkout return and activates plan| Bearer JWT | `JwtAuthGuard` | `SubscriptionsController.verifySession` |
| `POST` | `/api/v1/subscriptions/activate-free` | Activates Free 30-day tier for org | Bearer JWT | `JwtAuthGuard` | `SubscriptionsController.activateFree` |
| `POST` | `/api/v1/subscriptions/portal-session`| Creates Stripe customer billing portal link | Bearer JWT | `JwtAuthGuard` | `SubscriptionsController.createPortalSession` |
| `POST` | `/api/v1/subscriptions/webhook` | Handles Stripe billing events asynchronously | Stripe Signature | `StripeProvider` signature | `SubscriptionsController.handleWebhook` |
| `GET` | `/api/v1/health` | Comprehensive API, DB, Redis, AI diagnostic | None (Public) | None | `HealthController.check` |
| `GET` | `/api/v1/organizations` | Lists user's organization memberships | Bearer JWT | `JwtAuthGuard` | `OrganizationsController.list` |
| `POST` | `/api/v1/organizations` | Creates new organization workgroup | Bearer JWT | `JwtAuthGuard` | `OrganizationsController.create` |
| `GET` | `/api/v1/admin/users` | Paginated search of all user accounts | Admin JWT | `Roles(ADMIN, SUPER_ADMIN)` | `AdminController.listUsers` |
| `GET` | `/api/v1/admin/audit-logs` | Audits system activity logs | Admin JWT | `Roles(ADMIN, SUPER_ADMIN)` | `AdminController.listLogs` |
| `GET` | `/api/v1/admin/telemetry` | Dashboard usage & subscription telemetry | Admin JWT | `Roles(ADMIN, SUPER_ADMIN)` | `AdminController.getTelemetry` |
| `GET` | `/api/v1/ai/dashboard/summary`| Aggregated system event & forecast stats | Bearer JWT | `SubscriptionGateGuard` | `AiController.getDashboardSummary` |
| `GET` | `/api/v1/ai/events` | Lists extracted geopolitical events | Bearer JWT | `SubscriptionGateGuard` | `AiController.getEvents` |
| `GET` | `/api/v1/ai/predictions` | Retrieves capital flow forecasts | Bearer JWT | `SubscriptionGateGuard` (Free capped: 5) | `AiController.getPredictions` |
| `GET` | `/api/v1/ai/forecast/by-horizon`| Predictions grouped by horizon | Bearer JWT | `SubscriptionGateGuard` (Free capped: 1M) | `AiController.getForecastByHorizon` |
| `GET` | `/api/v1/ai/event-chain` | Lists causality event chains | Bearer JWT | `@RequirePlan('pro')` | `AiController.getEventChain` |
| `GET` | `/api/v1/ai/sna/summary` | Social Network Analysis graph statistics | Bearer JWT | `@RequirePlan('pro')` | `AiController.getGraphSummary` |
| `GET` | `/api/v1/ai/sna/top-influential`| Top influential network node rankings | Bearer JWT | `@RequirePlan('pro')` | `AiController.getTopInfluential` |
| `POST` | `/api/v1/ai/backtest/run` | Executes point-in-time historical backtest | Bearer JWT | `@RequirePlan('pro')` | `AiController.runBacktest` |
| `GET` | `/api/v1/ai/backtest/leakage-test`| Tests dataset for future-data leakage | Bearer JWT | `@RequirePlan('enterprise')` | `AiController.runLeakageTest` |
| `GET` | `/api/v1/ai/explain/event/:id`| 10-tier provenance chain for an event | Bearer JWT | `SubscriptionGateGuard` | `AiController.getExplainEvent` |
| `GET` | `/api/v1/ai/explain/forecast/:id`| 10-tier provenance chain for a forecast | Bearer JWT | `SubscriptionGateGuard` | `AiController.getExplainForecast` |
| `GET` | `/api/v1/ai/technical/:symbol` | Multi-timeframe indicator & SMC patterns | Bearer JWT | `SubscriptionGateGuard` | `AiController.getTechnicalAnalysis` |
| `GET` | `/api/v1/ai/market/observations`| Real-time asset OHLCV observation feed | Bearer JWT | `SubscriptionGateGuard` | `AiController.getMarketObservations` |
| `GET` | `/api/v1/ai/market-intelligence/event/:id`| 4-layer fused signal intelligence | Bearer JWT | `SubscriptionGateGuard` | `AiController.getEventMarketIntelligence` |

---

## 10. Frontend Architecture

### 10.1 Next.js 15 App Router Structure
The frontend application in `apps/web` leverages the Next.js 15 App Router with nested layouts, React Server Component (RSC) boundary isolation, and client-side reactive components.

```
apps/web/src/app/
├── layout.tsx                # Master HTML document, Google Fonts (Inter), QueryClientProvider
├── page.tsx                  # Public institutional landing page
├── plans/page.tsx            # Subscription plan selection and checkout launcher
├── (auth)/
│   ├── layout.tsx            # Minimalist glassmorphic authentication shell
│   ├── login/page.tsx        # Login form (email, password, rememberMe, Google OAuth button)
│   └── register/page.tsx     # Registration form (validation, password strength meter)
├── (dashboard)/
│   ├── layout.tsx            # Protected dashboard shell: TopNav, Sidebar, CommandPalette, AuthGuard
│   ├── dashboard/page.tsx    # Command center dashboard overview
│   ├── predictions/page.tsx  # Capital flow prediction grid & horizon filters
│   ├── flows/page.tsx        # Bilateral capital flow rotation analysis
│   ├── market/page.tsx       # Live market observations & abnormal signals
│   ├── technical/page.tsx    # Technical indicators & smart money concept patterns
│   ├── visualizations/page.tsx # NetworkX causality graph network visualizer
│   ├── validation/page.tsx   # Historical backtesting & leakage test dashboard
│   ├── events/page.tsx       # Geopolitical event extraction feed
│   ├── reports/page.tsx      # Saved analytical reports & CSV export
│   ├── admin/page.tsx        # User governance, role updates, system audit logs
│   ├── billing/page.tsx      # Billing settings, invoice list, Stripe portal link
│   ├── support/page.tsx      # Support ticket creation & system FAQ
│   ├── watchlist/page.tsx    # Pinned instruments and geopolitical regions
│   └── settings/             # Sub-pages for Profile, Appearance, Notifications, Security, Sessions
└── subscription/
    └── success/page.tsx      # Stripe redirect return verification & synchronous activation
```

### 10.2 State Management (Zustand Stores)
* `useAuthStore` ([`apps/web/src/lib/store/authStore.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/lib/store/authStore.ts)): Single source of truth for user session, live subscription tier, and capability helpers (`isSuperAdmin()`, `canAccessPro()`, `canAccessEnterprise()`).
* `useWorkspaceStore`: Active multi-tenant organization selector and workspace switching.
* `useWatchlistStore`: Persisted list of monitored geopolitical entities and ticker symbols.
* `useThemeStore`: Theme preference switching (Dark, Light, System).
* `useSidebarStore`: Collapsed / expanded state of desktop navigation sidebar.
* `useNotificationStore`: In-app notification badge counts and floating toast alert queue.
* `useCommandStore`: Keyboard shortcut command palette state (`Ctrl+K` / `Cmd+K`).

### 10.3 API Communication & Custom Hooks
* **Axios Client** ([`apps/web/src/lib/api-client.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/lib/api-client.ts)): Configured with base URL `http://localhost:3001/api`. Injects `Authorization: Bearer <token>` automatically on every request.
* **React Query Custom Hooks**:
  * `usePredictions`: Fetches capital flow forecasts with filtering and pagination.
  * `useDashboardStats`: Fetches high-level macroeconomic telemetry.
  * `useEconomicEvents`: Fetches extracted geopolitical event items.
  * `useTechnicalAnalysis`: Fetches multi-timeframe indicators and candlestick data.
  * `useExplainability`: Fetches 10-tier provenance chains for events and forecasts.
  * `useSignalFusion`: Fetches 4-layer fused signal intelligence.
  * `useBacktest`: Triggers and fetches point-in-time backtesting runs.

---

## 11. Backend Architecture

### 11.1 NestJS API Gateway Structure
* **Modular Design**: Structured into isolated feature modules (`AuthModule`, `SubscriptionsModule`, `AiModule`, `OrganizationsModule`, `AdminModule`, `ReportsModule`, `ProfileModule`, `HealthModule`).
* **Global Interceptors & Pipes**:
  * `XssSanitizationPipe` ([`apps/api/src/common/pipes/xss-sanitization.pipe.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/common/pipes/xss-sanitization.pipe.ts)): Strips malicious HTML/script tags from incoming payloads.
  * `ValidationPipe`: Whitelists DTO properties and rejects non-whitelisted attributes (`forbidNonWhitelisted: true`).
  * `TransformInterceptor` ([`apps/api/src/common/interceptors/transform.interceptor.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/common/interceptors/transform.interceptor.ts)): Normalizes all outgoing successful responses into standard `{ success: true, data: ... }` format.
  * `HttpExceptionFilter` ([`apps/api/src/common/filters/http-exception.filter.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/common/filters/http-exception.filter.ts)): Normalizes errors into `{ success: false, error: { statusCode, message, timestamp } }`.

### 11.2 Python FastAPI AI Engine Structure
* **Asynchronous Execution**: Powered by `asyncio`, Uvicorn, and SQLAlchemy `asyncpg` connection pool.
* **Modular Quantitative Layers**:
  * `capital_flow/`: Core rotation mathematics and horizon aggregators.
  * `event_chain/`: In-memory causality graph and propagation simulation.
  * `sna/`: Social Network Analysis graph centrality metric calculations via NetworkX.
  * `technical/`: Candlestick pattern recognition and Smart Money Concepts (SMC).
  * `ingestion/`: Multi-source data adapters with content hashing deduplication.
  * `providers/`: Swappable NLP adapters with automatic fallback to heuristic/stub engines.

---

## 12. External Integrations

| External Service | Implementation Location | Authentication Method | Required Environment Variables | Data Flow & Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Stripe Billing** | `apps/api/src/subscriptions/stripe.provider.ts` | Secret API Key (`Bearer sk_...`) | `STRIPE_SECRET_KEY`<br>`STRIPE_WEBHOOK_SECRET`<br>`STRIPE_PRO_PRICE_ID`<br>`STRIPE_ENTERPRISE_PRICE_ID` | Creates Checkout Sessions, verifies payment status, processes webhooks, provisions Billing Portal sessions. |
| **Google OAuth 2.0**| `apps/api/src/auth/auth.service.ts` | Client ID & Client Secret | `GOOGLE_CLIENT_ID`<br>`GOOGLE_CLIENT_SECRET`<br>`GOOGLE_CALLBACK_URL` | User consent flow, code exchange for access token, Google UserInfo retrieval. |
| **Yahoo Finance** | `apps/ai/providers/financial/yfinance_provider.py` | Public REST (Rate-limited) | None (Public Library) | Ingests 90-day daily OHLCV market observations for baseline Z-score abnormality detection. |
| **Federal Reserve (FRED)**| `apps/ai/providers/financial/fred_provider.py` | API Key Query Param | `FRED_API_KEY` | Fetches macroeconomic series (Treasury yields, Fed Funds rate, CPI, M2 money supply). |
| **World Bank API** | `apps/ai/providers/financial/worldbank_provider.py` | Open Data REST | None (Open Data) | Historical sovereign GDP, foreign direct investment, and trade volume data. |
| **US Congress Disclosures**| `apps/ai/providers/financial/congress_provider.py` | Public Scraping / API Key | `CONGRESS_API_KEY` | Legislative disclosures, committee trade notifications, and stock transaction tracking. |
| **NewsAPI** | `apps/ai/ingestion/sources/newsapi.py` | API Key Header | `NEWSAPI_API_KEY` | Real-time international news headline and article body ingestion. |
| **GDELT 2.0** | `apps/ai/ingestion/sources/gdelt.py` | Open Query API | None (Open Data) | Global Database of Events, Language, and Tone geopolitical event monitoring. |

---

## 13. Environment Variables Reference

| Variable Name | Purpose | Used By | Example / Default Pattern |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Gateway (Prisma) & AI (SQLAlchemy) | `postgresql://postgres:postgres@localhost:5432/geocapx?schema=public` |
| `JWT_SECRET` | Secret key for signing and verifying JWT tokens | Gateway (`AuthModule`, `JwtStrategy`) | Strong random 64-char string |
| `PORT` | HTTP port for NestJS API Gateway | Gateway (`main.ts`) | `3001` |
| `AI_SERVICE_URL` | Internal URL pointing to Python FastAPI AI engine | Gateway (`AiService`, `AiModule`) | `http://localhost:8000` |
| `REDIS_HOST` | Redis cache hostname | Gateway & AI Engine | `localhost` |
| `REDIS_PORT` | Redis cache port | Gateway & AI Engine | `6379` |
| `REDIS_URL` | Full Redis connection URI | AI Engine (`core/redis_client.py`) | `redis://localhost:6379/1` |
| `CORS_ALLOWED_ORIGINS` | Comma-delimited whitelist of frontend origins | Gateway (`main.ts`) | `http://localhost:3000,http://localhost:3001` |
| `FRONTEND_URL` | Client URL for Stripe redirect success/cancel URLs | Gateway (`SubscriptionsService`) | `http://localhost:3000` |
| `THROTTLE_TTL` | Rate limiting sliding time window in seconds | Gateway (`AppModule`) | `60` |
| `THROTTLE_LIMIT` | Max allowed requests per IP within THROTTLE_TTL | Gateway (`AppModule`) | `100` |
| `STRIPE_SECRET_KEY` | Stripe secret key for server API calls | Gateway (`StripeProvider`) | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET`| Cryptographic secret for verifying Stripe webhooks| Gateway (`StripeProvider`) | `whsec_...` |
| `STRIPE_PRO_PRICE_ID` | Optional pre-configured Stripe Price ID for Pro | Gateway (`SubscriptionsService`) | `price_...` |
| `STRIPE_ENTERPRISE_PRICE_ID`| Optional pre-configured Price ID for Enterprise| Gateway (`SubscriptionsService`) | `price_...` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client Identifier | Gateway (`AuthService`) | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Google OAuth 2.0 Client Secret | Gateway (`AuthService`) | Secret alphanumeric string |
| `GOOGLE_CALLBACK_URL` | Redirect URI for Google OAuth exchange | Gateway (`AuthService`) | `http://localhost:3000/auth/callback/google` |
| `NEXT_PUBLIC_API_URL` | Gateway API URL reachable from user browser | Frontend (`apiClient.ts`, `authStore.ts`) | `http://localhost:3001/api` |
| `NLP_PROVIDER` | Selected NLP provider ('spacy', 'finbert', 'stub')| AI Engine (`config.py`) | `spacy` |
| `SPACY_MODEL` | SpaCy linguistic model name | AI Engine (`config.py`) | `en_core_web_sm` |
| `OPENAI_API_KEY` | Optional OpenAI key for LLM feature extraction | AI Engine (`providers/openai_provider.py`)| `sk-...` |
| `GEMINI_API_KEY` | Optional Google Gemini API key for analysis | AI Engine (`providers/gemini_provider.py`)| Secret alphanumeric string |
| `FRED_API_KEY` | Federal Reserve Economic Data API key | AI Engine (`fred_provider.py`) | 32-char hex string |
| `NEWSAPI_API_KEY` | NewsAPI article ingestion key | AI Engine (`newsapi.py`) | 32-char hex string |

---

## 14. Security Architecture

GeoCap-X implements an enterprise defense-in-depth posture:

1. **Cryptographic Password Security**:
   * Uses **Argon2id** via `@node-rs/argon2`. Argon2 is resistant to GPU-assisted brute-force and side-channel timing attacks.
   * Passwords must adhere to strict complexity requirements: minimum 8 characters, at least 1 uppercase, 1 lowercase, and 1 number.
2. **Stateless JWT with Single-Use Refresh Token Rotation**:
   * Access tokens expire quickly.
   * Refresh tokens are single-use: whenever a client calls `/api/v1/auth/refresh`, the presented refresh token is immediately marked `isRevoked: true`, and a newly minted cryptographically random token is returned.
3. **Cookie Hardening & BFCache Attack Prevention**:
   * Session refresh tokens are delivered via `HttpOnly` cookies, preventing cross-site scripting (XSS) exfiltration.
   * Next.js edge middleware and NestJS controllers inject `Cache-Control: no-store, no-cache, must-revalidate` on all protected routes to ensure browsers do not cache sensitive financial views in the back-forward cache (bfcache) after logout.
4. **Server-Side Subscription Gating**:
   * Entitlements are never evaluated based on user-manipulable client state. `SubscriptionGateGuard` queries the database source of truth on the server before dispatching queries to the AI engine.
5. **Payload Sanitization & Strict Validation**:
   * Global `XssSanitizationPipe` strips executable HTML and JavaScript from request strings.
   * NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips or rejects unexpected payload parameters, defeating mass-assignment vulnerabilities.
6. **Denial of Service (DoS) Rate Limiting**:
   * Global `ThrottlerGuard` enforces a default quota of 100 requests per 60-second window per IP.
   * Strict rate limiting (10 req/min for login/register; 3 req/min for password reset) defeats credential stuffing.
7. **HTTP Security Headers**:
   * Configured via `helmet` in `main.ts` with Content Security Policy (CSP), HTTP Strict Transport Security (HSTS with 1-year preload), and clickjacking frame protection (`X-Frame-Options: DENY`).
8. **Stripe Webhook Signature Verification**:
   * All incoming Stripe webhook events are cryptographically verified using `stripe.webhooks.constructEvent()` against `STRIPE_WEBHOOK_SECRET` before any database records are modified.

---

## 15. Important Business Logic & Rules

### 15.1 Mandatory Onboarding & Subscription Gate
* **The Rule**: When a user registers (or signs in via Google OAuth for the first time), their account is assigned an initial subscription status of `UNPAID`.
* **Enforcement Location**:
  * Backend: [`apps/api/src/auth/auth.service.ts:L76-L88`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.service.ts#L76-L88).
  * Frontend: [`apps/web/src/components/auth/AuthGuard.tsx:L50-L55`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/components/auth/AuthGuard.tsx#L50-L55).
* **Behavior**: Unsubscribed users are blocked from viewing `/dashboard` or calling `/api/v1/ai/*` and are redirected to `/plans` to activate either the Free Sandbox tier or a paid Stripe tier.

### 15.2 Free Tier Server-Side Feature Capping
* **The Rule**: Free tier users are capped at viewing the top 5 capital flow predictions and can only access the 1-Month forecast horizon.
* **Enforcement Location**: [`apps/api/src/ai/ai.controller.ts:L35-L84`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/ai/ai.controller.ts#L35-L84).
* **Behavior**: The NestJS gateway server-side slices prediction arrays (`data.slice(0, 5)`) and restricts horizon dictionaries before returning data to the client, preventing clients from modifying JavaScript code to unlock full feeds.

### 15.3 Pro & Enterprise Exclusive Visualizations
* **The Rule**: Advanced network graph visualizations (SNA, PageRank, causal chains) require a minimum **Pro** tier; leakage testing requires an **Enterprise** tier.
* **Enforcement Location**:
  * Backend: Decorated with `@RequirePlan('pro')` and `@RequirePlan('enterprise')` in [`apps/api/src/ai/ai.controller.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/ai/ai.controller.ts).
  * Frontend: Wrapped in `<SubscriptionGate requiredTier="pro">` in [`apps/web/src/components/subscription/subscription-gate.tsx`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/components/subscription/subscription-gate.tsx).

### 15.4 Super Admin Master Bypass
* **The Rule**: System users with role `SUPER_ADMIN` or email `admin@gmail.com` bypass all paywalls and subscription restrictions.
* **Enforcement Location**:
  * Backend: [`apps/api/src/common/guards/subscription-gate.guard.ts:L45-L48`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/common/guards/subscription-gate.guard.ts#L45-L48).
  * Frontend: [`apps/web/src/lib/store/authStore.ts:L274-L282`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/lib/store/authStore.ts#L274-L282).

### 15.5 Statistical Abnormality Detection (Z-Score)
* **The Rule**: Financial abnormality is determined by calculating the standard deviation of pre-event historical prices/volumes:
  $$\mu = \frac{1}{N}\sum_{i=1}^{N} X_i, \quad \sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N} (X_i - \mu)^2}, \quad Z = \frac{X_{\text{event}} - \mu}{\sigma}$$
  If $|Z| \ge 2.0$, the event is classified as an `EVENT_RELATED_MARKET_ANOMALY`; if $|Z| < 2.0$, it is classified as `EVENT_ALIGNED_MARKET_SIGNAL`.
* **Enforcement Location**: [`apps/ai/capital_flow/event_window.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/capital_flow/event_window.py) and [`apps/ai/capital_flow/abnormality.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/capital_flow/abnormality.py).

---

## 16. "If Evaluator Asks..." Quick Reference

| If Evaluator Asks... | Primary File to Open | Exact Function / Section to Inspect |
| :--- | :--- | :--- |
| **"Where is user login handled?"** | [`apps/api/src/auth/auth.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.service.ts) | `async login(dto, ipAddress, userAgent)` (Line 156) |
| **"Where is user registration handled?"** | [`apps/api/src/auth/auth.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.service.ts) | `async register(dto, ipAddress, userAgent)` (Line 19) |
| **"Where is password hashing implemented?"** | [`apps/api/src/common/utils/hash.util.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/common/utils/hash.util.ts) | `hashPassword()` and `verifyPassword()` |
| **"Where is user logout and cookie clearing?"** | [`apps/api/src/auth/auth.controller.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.controller.ts) | `async logout(...)` (Line 153) |
| **"Where is the database connection established?"** | [`apps/api/src/database/prisma.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/database/prisma.service.ts) | `onModuleInit()` (Line 6) |
| **"Where are the database tables defined?"** | [`apps/api/prisma/schema.prisma`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/prisma/schema.prisma) | Lines 33–538 (Users, Subscriptions, Events) |
| **"Where are subscription plans defined?"** | [`apps/api/prisma/schema.prisma`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/prisma/schema.prisma) | `model SubscriptionPlan` (Line 184) & `sync_plans.js` |
| **"Where is Stripe checkout created?"** | [`apps/api/src/subscriptions/stripe.provider.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/stripe.provider.ts) | `async createCheckoutSession(...)` (Line 31) |
| **"Where is Stripe payment verified?"** | [`apps/api/src/subscriptions/subscriptions.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/subscriptions.service.ts) | `async verifyCheckoutSession(...)` (Line 158) |
| **"Where are Stripe webhooks processed?"** | [`apps/api/src/subscriptions/subscriptions.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/subscriptions.service.ts) | `async handleWebhook(event)` (Line 344) |
| **"Where are subscription limits enforced on the backend?"**| [`apps/api/src/common/guards/subscription-gate.guard.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/common/guards/subscription-gate.guard.ts) | `async canActivate(context)` (Line 17) |
| **"Where is the Free plan 5-prediction limit enforced?"** | [`apps/api/src/ai/ai.controller.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/ai/ai.controller.ts) | `async getPredictions(...)` (Lines 35–60) |
| **"Where is frontend route protection handled?"** | [`apps/web/src/middleware.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/middleware.ts) | `export function middleware(request)` (Line 26) |
| **"Where is the frontend AuthGuard component?"** | [`apps/web/src/components/auth/AuthGuard.tsx`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/components/auth/AuthGuard.tsx) | `export function AuthGuard(...)` (Line 12) |
| **"Where is the frontend paywall gate component?"** | [`apps/web/src/components/subscription/subscription-gate.tsx`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/components/subscription/subscription-gate.tsx) | `export function SubscriptionGate(...)` (Line 16) |
| **"Where is the capital flow forecasting algorithm?"** | [`apps/ai/capital_flow/engine.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/capital_flow/engine.py) | `generate_predictions_for_events()` (Line 34) |
| **"Where is the 10-tier provenance explainability engine?"**| [`apps/ai/capital_flow/unified_explainer.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/capital_flow/unified_explainer.py) | `explain_event()` & `explain_forecast()` |
| **"Where is social network analysis (PageRank) calculated?"**| [`apps/ai/sna/analyzer.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/sna/analyzer.py) | `compute_centrality_metrics()` |
| **"Where is point-in-time backtesting performed?"** | [`apps/ai/capital_flow/backtest_engine.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/capital_flow/backtest_engine.py) | `run_backtest()` |
| **"Where is lookahead information leakage tested?"** | [`apps/ai/capital_flow/leakage_tester.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/capital_flow/leakage_tester.py) | `test_dataset_leakage()` |
| **"Where is technical analysis & SMC patterns generated?"** | [`apps/ai/technical/engine.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/technical/engine.py) | `analyze_market_structure()` & `calculate_indicators()` |
| **"Where is the main dashboard data loaded?"** | [`apps/web/src/app/(dashboard)/dashboard/page.tsx`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/app/%28dashboard%29/dashboard/page.tsx) | Queries `useDashboardStats`, `useEconomicEvents`, `useNetworkStats` |

---

## 17. Common Modification Locations

### If you need to...
* **Change subscription plan prices or names**:
  → Update [`apps/api/sync_plans.js`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/sync_plans.js) and re-run `node apps/api/sync_plans.js`.
* **Change password complexity rules**:
  → Modify `PASSWORD_REGEX` and `PASSWORD_MSG` in [`apps/api/src/auth/auth.controller.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.controller.ts#L9-L10).
* **Adjust token expiration lifetimes**:
  → Edit `cookieMaxAge` in [`apps/api/src/auth/auth.controller.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.controller.ts#L83) and `refreshLifespanDays` in [`apps/api/src/auth/auth.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.service.ts#L204).
* **Add a new protected route to Next.js edge middleware**:
  → Add the path prefix to `PROTECTED_PREFIXES` array in [`apps/web/src/middleware.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/middleware.ts#L5-L21).
* **Modify Stripe Checkout parameters or success redirect URL**:
  → Edit `createCheckoutSession` in [`apps/api/src/subscriptions/subscriptions.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/subscriptions.service.ts#L134-L148).
* **Change rate limiting quotas (Throttler)**:
  → Update `THROTTLE_LIMIT` and `THROTTLE_TTL` in `.env` or in [`apps/api/src/app.module.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/app.module.ts#L45-L54).
* **Add a new database model or column**:
  → Edit [`apps/api/prisma/schema.prisma`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/prisma/schema.prisma) and run `npx prisma db push` or `npx prisma migrate dev`.
* **Add a new AI endpoint**:
  → Implement the endpoint in [`apps/ai/api/v1/`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/api/v1/) and proxy it in [`apps/api/src/ai/ai.controller.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/ai/ai.controller.ts).
* **Modify capital flow rotation decay rates across horizons**:
  → Adjust formulas in [`apps/ai/capital_flow/horizons.py`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/ai/capital_flow/horizons.py).
* **Customize frontend dashboard navigation items**:
  → Edit sidebar link definitions in [`apps/web/src/components/dashboard/sidebar.tsx`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/components/dashboard/sidebar.tsx).

---

## 18. Important Dependencies & Data Lifecycles

### 18.1 Authentication Dependency Chain
```
User Registration Request
  ↓ Validates password regex & matching confirmPassword
  ↓ Hashes password with Argon2
  ↓ Creates User, Profile, UserSettings, Tenant Organization, Member (OWNER)
  ↓ Creates initial Subscription (status: UNPAID)
  ↓ Signs JWT Access Token & Stores Refresh Token in DB
  ↓ Sets cookies: HttpOnly 'refreshToken', client-readable 'geocapx_auth_token'
  ↓ Next.js AuthGuard redirects user to /plans
```

### 18.2 Payment & Plan Enforcement Dependency Chain
```
User selects Pro Plan on /plans
  ↓ SubscriptionsController.createCheckoutSession()
  ↓ StripeProvider initializes Stripe Checkout session with dynamic recurring monthly line item
  ↓ User redirected to Stripe Hosted Checkout
  ↓ Payment successful → Redirects to /subscription/success?session_id=...
  ↓ SubscriptionsController.verifyCheckoutSession() validates status = "paid" with Stripe API
  ↓ PostgreSQL: subscription.status = ACTIVE, planId = Pro, currentPeriodEnd = +30 days
  ↓ Database creates Invoice & Payment records
  ↓ Client useAuthStore re-hydrates live subscription
  ↓ SubscriptionGateGuard unlocks Pro features (SNA graph, multi-horizon, 10,000 queries)
```

### 18.3 Capital Flow Prediction Data Pipeline
```
Raw News / RSS / GDELT Ingestion
  ↓ Deduplication (SHA-256 text hash check)
  ↓ NLP Entity Extraction (Entities, Countries, Sectors, Sentiment Polarity)
  ↓ Canonical Event Clustering (Cluster hash)
  ↓ Event-to-Asset Mapping (Maps event to equities, forex, commodities)
  ↓ Real Market OHLCV Observation Fetch (Yahoo Finance 90-day window)
  ↓ Statistical Baseline & Z-Score Abnormality Calculation
  ↓ NetworkX SNA Graph Centrality (PageRank & Degree influence)
  ↓ Horizon Rotation Scaling (6M, 1Y, 3Y, 5Y in USD Billions)
  ↓ Bayesian Alternative Scenarios (Baseline, Bullish, Bearish probabilities)
  ↓ 10-Tier Provenance Traceability Chain Creation
  ↓ Presentation on Institutional Frontend Dashboard
```

---

## 19. Deployment & Configuration

### 19.1 Monorepo Build Commands
```bash
# 1. Install all dependencies across all monorepo workspaces
npm install

# 2. Build shared TypeScript package
npm run build:shared

# 3. Build UI package
npm run build:ui

# 4. Build Next.js Web Application
npm run build:web

# 5. Build NestJS API Gateway
npm run build:api

# 6. Build entire monorepo
npm run build
```

### 19.2 Local Development Commands
```bash
# Start NestJS API Gateway (Port 3001)
npm run dev:api

# Start Python FastAPI AI Engine (Port 8000)
cd apps/ai
.venv\Scripts\python.exe main.py

# Start Next.js 15 Web Application (Port 3000)
npm run dev:web

# Concurrently run all three services in a single terminal
npm run dev
```

### 19.3 Multi-Container Docker Compose Deployment
Configured in [`docker-compose.yml`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/docker-compose.yml):
```bash
# Launch entire production stack in the background
docker-compose up -d --build
```
Containers provisioned:
1. `geocapx-postgres`: PostgreSQL 15 on port `5432` with persisted volume `pgdata`.
2. `geocapx-redis`: Redis 7 Alpine on port `6379` with persisted volume `redisdata`.
3. `geocapx-api`: NestJS API Gateway on port `3001`.
4. `geocapx-ai`: Python FastAPI engine on port `8000`.
5. `geocapx-web`: Next.js 15 App on port `3000`.
6. `geocapx-nginx`: NGINX reverse proxy on ports `80` and `443`.

---

## 20. Troubleshooting Map

| Symptom / Issue | Potential Root Cause | File to Investigate | Diagnostic / Resolution Steps |
| :--- | :--- | :--- | :--- |
| **Login returns 401 Unauthorized** | Invalid credentials, deactivated account (`isActive: false`), or deleted user | [`apps/api/src/auth/auth.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/auth/auth.service.ts#L156) | Verify email in `users` table; check `passwordHash` verification; verify `isActive = true`. |
| **User redirected to `/plans` after login** | Account has initial `UNPAID` subscription status | [`apps/web/src/components/auth/AuthGuard.tsx`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/components/auth/AuthGuard.tsx#L50) | Normal behavior for new accounts; user must activate Free Sandbox tier or complete Stripe checkout. |
| **Stripe Checkout fails with 400 Bad Request** | `STRIPE_SECRET_KEY` missing or invalid in environment | [`apps/api/src/subscriptions/stripe.provider.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/stripe.provider.ts#L38) | Set a valid test key (starts with `sk_test_...`) in `apps/api/.env`. |
| **Stripe Webhook returns 400 Signature Error** | Webhook secret mismatch | [`apps/api/src/subscriptions/stripe.provider.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/subscriptions/stripe.provider.ts#L141) | Ensure `STRIPE_WEBHOOK_SECRET` in `.env` matches the secret generated by Stripe CLI or dashboard. |
| **Dashboard predictions capped at 5** | Current organization is on Free Sandbox tier | [`apps/api/src/ai/ai.controller.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/ai/ai.controller.ts#L35) | Expected tier behavior; upgrade to Pro ($129/mo) or log in as Super Admin (`admin@gmail.com`). |
| **AI requests return 503 Service Unavailable** | FastAPI service on port 8000 is not running | [`apps/api/src/ai/ai.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/ai/ai.service.ts#L65) | Verify `apps/ai` process is active: check `http://localhost:8000/health` or restart `python main.py`. |
| **AI requests return 504 Gateway Timeout** | AI computation took longer than 15-second abort limit | [`apps/api/src/ai/ai.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/ai/ai.service.ts#L17) | Check AI service system CPU utilization or reduce size of queried event window. |
| **Database connection refused (`5432`)** | PostgreSQL container or local service is stopped | [`apps/api/src/database/prisma.service.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/api/src/database/prisma.service.ts) | Run `docker-compose up -d db` or check PostgreSQL service status in Windows Services. |
| **BFCache leak after logout (back button shows dashboard)** | Missing Cache-Control headers | [`apps/web/src/middleware.ts`](file:///d:/Long%20Horizon%20Capital%20Flow%20Prediction%20System/apps/web/src/middleware.ts#L60) | Ensure middleware sets `Cache-Control: no-store, no-cache, must-revalidate` on protected paths. |

---

## 21. Final System Flow: End-to-End Walkthrough

To synthesize the entire architecture, consider a user navigating the complete lifecycle:

1. **Visitor Arrival**:
   A hedge fund quant visits `http://localhost:3000`. The public landing page renders key value propositions, active predictions, and architecture diagrams.
2. **Registration**:
   The visitor navigates to `/register` and submits their details.
   * `AuthController.register()` hashes the password with Argon2.
   * A PostgreSQL transaction provisions the user, personal organization, sets the user as `OWNER`, and initializes an `UNPAID` subscription.
   * An access token is returned and `refreshToken` (HttpOnly) & `geocapx_auth_token` cookies are set.
3. **Plan Onboarding Gate**:
   Because the subscription is `UNPAID`, the frontend `AuthGuard` detects inactive subscription status and redirects the user to `/plans`.
4. **Subscription Activation**:
   The user selects the **Pro Trader** tier ($129/mo).
   * Frontend calls `POST /api/v1/subscriptions/checkout-session`.
   * Gateway calls `StripeProvider.createCheckoutSession()`, generating a hosted Stripe checkout URL.
   * User enters test credentials (`4242 •••• •••• 4242`) and confirms.
   * Stripe redirects the browser to `/subscription/success?session_id=cs_test_...`.
   * Success page triggers `verifyCheckoutSession()`, which checks payment with Stripe, updates PostgreSQL subscription status to `ACTIVE`, and sets `currentPeriodEnd = +30 days`.
5. **Dashboard Access**:
   The user is redirected to `/dashboard`.
   * Edge `middleware.ts` detects the `geocapx_auth_token` cookie and allows the request.
   * `AuthGuard` verifies session with `GET /api/v1/auth/me`. The server confirms an active `Pro` plan.
   * Dashboard loads telemetry via `GET /api/v1/ai/dashboard/summary`.
6. **Quantitative Analysis & Forecast Generation**:
   The user navigates to `/predictions`.
   * Client calls `GET /api/v1/ai/predictions`.
   * NestJS `SubscriptionGateGuard` confirms active Pro subscription.
   * Gateway reverse-proxies call to FastAPI AI engine on port 8000.
   * The AI engine runs `generate_predictions_for_events()`, maps events to financial instruments, fetches historical prices via `RealYahooFinanceProvider`, computes standard deviation Z-scores via `EventWindowAnalyzer`, scales rotation magnitudes via `HorizonAggregator` (6M, 1Y), and calculates Bayesian scenarios.
7. **Traceability Inspection (XAI)**:
   The user clicks on an individual prediction to view the provenance modal.
   * Calls `GET /api/v1/ai/explain/forecast/:id`.
   * `UnifiedExplanationEngine` builds a 10-stage traceability chain (Source → Raw Data → Normalized → Canonical → Relationship → Graph SNA → Network Exposure → Market Signal → Forecast Scenario → User Facing Result) and details calculations and confidence breakdowns.
8. **Logout & Session Invalidation**:
   The user clicks "Log Out" in the user menu.
   * `AuthController.logout()` revokes the refresh token and sets active sessions to `false` in PostgreSQL.
   * Cookies are cleared (`refreshToken`, `geocapx_auth_token`).
   * Hard page refresh to `/login` prevents browser history back-button leaks.

---
*End of Master Technical Documentation — GeoCap-X Enterprise Foundation.*
