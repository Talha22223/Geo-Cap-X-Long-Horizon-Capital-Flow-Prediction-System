# GeoCap-X — Long-Horizon Capital Flow Prediction System

[![CI/CD Pipeline](https://github.com/Talha22223/Geo-Cap-X-Long-Horizon-Capital-Flow-Prediction-System/actions/workflows/ci.yml/badge.svg)](https://github.com/Talha22223/Geo-Cap-X-Long-Horizon-Capital-Flow-Prediction-System/actions)
[![Node.js](https://img.shields.io/badge/Node.js-v20.x-339933?logo=node.js)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10.4-E0234E?logo=nestjs)](https://nestjs.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)

**GeoCap-X** is an institutional-grade SaaS platform engineered for long-horizon cross-border capital flow forecasting, automated macroeconomic and geopolitical event extraction, causality network graph modeling, statistical anomaly detection, and point-in-time forecast backtesting.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running Locally](#running-locally)
- [Model & Prediction Pipeline](#model--prediction-pipeline)
- [Core API Reference](#core-api-reference)
- [Deployment](#deployment)
- [Security](#security)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Troubleshooting](#troubleshooting)
- [License & Project Status](#license--project-status)

---

## 🌐 Overview

Cross-border capital allocations and foreign direct investments (FDI) are notoriously vulnerable to sudden geopolitical shifts, central bank interest rate divergences, and systemic macroeconomic shocks. Traditional econometric forecasting methods either operate on delayed quarterly reporting cycles or lack qualitative causality context.

**GeoCap-X** bridges qualitative geopolitical news intelligence with quantitative financial market econometrics:
- **The Problem It Solves**: Ingests, normalizes, and links fragmented global news events with real-time financial time-series to predict where global capital will rotate across 6-month, 1-year, 3-year, and 5-year investment horizons.
- **Explainability**: Unlike black-box ML systems, every capital flow projection in GeoCap-X provides explainable SHAP (SHapley Additive exPlanations) attribution scores, Social Network Analysis (SNA) propagation chains, and full audit provenance tracing.
- **Enterprise-Ready**: Backed by a high-concurrency microservices architecture featuring role-based access control (RBAC), multi-tenant organization workspaces, and integrated Stripe subscription lifecycle billing.

---

## 🌟 Key Features

| Category | Capability | Technical Details |
| :--- | :--- | :--- |
| **Forecasting** | Multi-Horizon Flow Predictions | Forecasts net capital inflows/outflows across 45+ bilateral country corridors for 6M, 1Y, 3Y, and 5Y horizons. |
| **NLP & Events** | Automated Geopolitical Event Extraction | Spacy NER + VADER / TextBlob sentiment engine extracting event chains, geopolitical entities, and severity indices. |
| **Graph AI** | Causality & Network Analysis | NetworkX & Louvain community detection computing PageRank, Betweenness, and Eigenvector centralities. |
| **Validation** | Point-in-Time Leakage & Backtesting | Historical split evaluation validating forecasting accuracy with Mean Absolute Percentage Error (MAPE) and directional accuracy metrics. |
| **Markets** | Anomaly Detection & Signals | Real-time Z-Score anomaly detectors for volume, volatility spikes, and cross-asset correlation breaks. |
| **Technical** | Institutional Interactive Charts | Multi-timeframe candlestick visualizer with moving averages (SMA/EMA), RSI, MACD, and Bollinger Bands. |
| **Security** | Enterprise Multi-Tenant RBAC | Strict JWT authentication with refresh token rotation, Argon2 password hashing, and granular workspace isolation. |
| **Monetization**| Stripe Billing & Subscription Tiers | Automated checkout sessions, self-service customer portal, and idempotent webhook processors for Free, Pro, and Enterprise tiers. |

---

## 🏗️ System Architecture

```text
[ Data Sources: NewsAPI, FRED, Congress, World Bank, Yahoo Finance ]
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │      FastAPI AI Engine (Port :8000)          │
         │  - NLP Entity Extraction (spaCy + VADER)     │
         │  - NetworkX Causality Graph & Louvain        │
         │  - Multi-Horizon Forecasting & SHAP Engine   │
         │  - Statistical Z-Score Anomaly Detectors     │
         └──────────────────────┬───────────────────────┘
                                │ Internal REST
                                ▼
         ┌──────────────────────────────────────────────┐
         │       NestJS API Gateway (Port :3001)        │
         │  - Global Throttling & Rate Limiting         │
         │  - JWT Auth Guard & RBAC System Roles        │
         │  - Stripe Payment Provider & Webhooks        │
         │  - Prisma ORM (Schema Migrations & Audits)   │
         └──────────────┬───────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────────────┐
         │      Next.js 15 Client (Port :3000)          │
         │  - App Router with React Server Components   │
         │  - Tailwind CSS Dark Glassmorphism UI        │
         │  - Recharts & Interactive Graph Panels       │
         │  - Client-side Auth & Subscription Guards    │
         └──────────────────────────────────────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
       [( PostgreSQL 15 )]            [( Redis 7 Cache )]
```

---

## 💻 Technology Stack

### Frontend Application
- **Framework**: Next.js 15.5 (App Router, React 19)
- **Styling**: Tailwind CSS, Lucide React, Glassmorphism aesthetic
- **State Management**: Zustand stores (Auth, Theme, Notifications, Sidebar, Commands)
- **Data Visualization**: Recharts, SVG graph canvases, interactive financial indicators

### API Gateway & Microservices
- **Backend Gateway**: NestJS 10.4 (Express platform, TypeScript)
- **AI & Analytics Microservice**: FastAPI 0.115 (Python 3.11+, Pydantic v2, Uvicorn)
- **Database ORM**: Prisma 5.22 (PostgreSQL) + SQLAlchemy 2.0 (AsyncPG)
- **Caching & Queues**: Redis 7, BullMQ, RQ (Redis Queue)
- **Authentication**: Passport-JWT, Argon2 hashing, Refresh token cookies
- **Billing Integration**: Stripe Node SDK (v2024-12-18)

---

## 📁 Project Structure

```text
.
├── .github/
│   └── workflows/ci.yml         # GitHub Actions continuous integration workflow
├── apps/
│   ├── ai/                      # FastAPI Python AI & Analytics Engine
│   │   ├── api/routes/          # REST endpoints (predictions, events, network, etc.)
│   │   ├── core/                # Database engine, Redis connection, settings
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── pipelines/           # NLP, feature engineering, and inference pipelines
│   │   ├── tests/               # Pytest suite (54 test cases)
│   │   ├── main.py              # Application entry point
│   │   └── requirements.txt     # Python dependencies
│   ├── api/                     # NestJS API Gateway & Enterprise Server
│   │   ├── prisma/              # Prisma schema & database seed script
│   │   ├── src/                 # Auth, Subscriptions, AI Proxy, Admin modules
│   │   └── package.json         # API dependencies
│   └── web/                     # Next.js 15 Modern Web Client
│       ├── src/app/             # App Router pages (Dashboard, Events, Plans, etc.)
│       ├── src/components/      # Reusable UI components & navigation layouts
│       ├── src/lib/             # Zustand stores & API client hooks
│       └── package.json         # Web client dependencies
├── docker/                      # Container definitions & Nginx reverse proxy configs
├── docs/                        # In-depth architectural & mathematical specifications
├── packages/                    # Monorepo shared packages
│   ├── config/                  # Shared ESLint, Prettier, TypeScript configurations
│   ├── shared/                  # Common TypeScript interfaces, DTOs, and constants
│   └── ui/                      # Shared reusable UI component library
├── docker-compose.yml           # Full-stack multi-container production configuration
├── SYSTEM_DOCUMENTATION.md      # Master technical architectural reference document
├── package.json                 # Monorepo root workspaces manifest
└── README.md                    # Project documentation
```

---

## ⚙️ Prerequisites

Ensure your development machine has the following tools installed:
- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Python**: `3.11` or higher
- **PostgreSQL**: `15.x` or higher (or a cloud PostgreSQL instance such as Neon)
- **Redis**: `7.x` or higher (or a cloud Redis service)
- **Docker & Docker Compose** (Optional, for containerized execution)

---

## 📥 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Talha22223/Geo-Cap-X-Long-Horizon-Capital-Flow-Prediction-System.git
cd Geo-Cap-X-Long-Horizon-Capital-Flow-Prediction-System
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Setup Python Virtual Environment
```bash
cd apps/ai
python -m venv .venv

# On Linux / macOS:
source .venv/bin/activate

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python -m spacy download en_core_web_sm
cd ../..
```

---

## 🔐 Environment Configuration

The application requires environment configuration files for each component. Example templates with non-sensitive placeholders are provided across the repository:

### 1. Root Monorepo Configuration
```bash
cp .env.example .env
```

### 2. NestJS API Gateway Configuration
```bash
cp apps/api/.env.example apps/api/.env
```
Edit [`apps/api/.env`](apps/api/.env) with your local database URL and secrets:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/geocapx?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Stripe Payment Gateway (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_price_id
```

### 3. FastAPI AI Engine Configuration
```bash
cp apps/ai/.env.example apps/ai/.env
```
Edit [`apps/ai/.env`](apps/ai/.env):
```env
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/geocapx
REDIS_URL=redis://localhost:6379/1
NLP_PROVIDER=spacy
SPACY_MODEL=en_core_web_sm
```

### 4. Next.js Web Client Configuration
```bash
cp apps/web/.env.example apps/web/.env.local
```
Edit [`apps/web/.env.local`](apps/web/.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_AI_URL=http://localhost:8000
NODE_ENV=development
```

---

## 🚀 Running Locally

### Initialize Database Schema
```bash
# Run Prisma migrations & seed baseline subscription plans and roles
npm run db:push -w apps/api
npm run db:seed -w apps/api
```

### Option A: Run All Services Concurrently
From the project root:
```bash
npm run dev
```
This runs the Next.js Frontend (`:3000`), NestJS API (`:3001`), and FastAPI AI Engine (`:8000`) simultaneously in a single terminal with colored logs.

### Option B: Run Services Individually
- **API Gateway**:
  ```bash
  npm run dev:api
  ```
- **FastAPI AI Engine**:
  ```bash
  cd apps/ai
  python main.py
  ```
- **Next.js Web Frontend**:
  ```bash
  npm run dev:web
  ```

---

## 🧠 Model & Prediction Pipeline

The analytical core of GeoCap-X executes a multi-stage machine learning and natural language pipeline:

1. **Ingestion Layer**: Ingests macroeconomic indicators, central bank policies, and global news feeds.
2. **Entity & Sentiment Extraction**: Uses `spaCy` NLP for Named Entity Recognition (corridor country pairs) and `VADER` / `TextBlob` for sentiment polarities and severity scoring.
3. **Causality Graph Network**: Constructs directed propagation graphs using `NetworkX`, calculating Eigenvector, PageRank, and Betweenness centrality scores to identify systemic bridge events.
4. **Predictive Forecasting**: Projects net capital flows across multi-period horizons (6M, 1Y, 3Y, 5Y) with normalized confidence boundaries.
5. **Explainability & Attribution**: Derives feature importance utilizing SHAP values to explain which geopolitical catalysts exerted the highest directional influence on each forecast.
6. **Market Confirmation**: Runs statistical Z-Score anomaly detectors across exchange rates, sovereign bond spreads, and equity volatility indices to validate qualitative signals against hard financial markets.

---

## 📡 Core API Reference

The NestJS API Gateway provides standardized endpoints under `/api/v1`:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new organization user account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user, returns access token + sets refresh cookie | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate access token via HTTP-only refresh cookie | Public |
| `GET` | `/api/v1/health` | Comprehensive microservice health check | Public |
| `GET` | `/api/v1/subscriptions/plans` | Fetch available subscription tiers (Free, Pro, Enterprise) | Public |
| `POST` | `/api/v1/subscriptions/checkout-session` | Create hosted Stripe checkout session | Bearer JWT |
| `POST` | `/api/v1/subscriptions/verify-session` | Verify completed Stripe checkout and activate plan | Bearer JWT |
| `POST` | `/api/v1/subscriptions/portal-session` | Launch self-service Stripe billing portal | Bearer JWT |
| `POST` | `/api/v1/subscriptions/webhook` | Stripe billing webhook handler (idempotent) | Stripe Signature |
| `GET` | `/api/v1/ai/predictions` | Proxies multi-horizon capital flow forecasts | Bearer JWT |
| `GET` | `/api/v1/ai/events` | Proxies extracted geopolitical event chains | Bearer JWT |
| `GET` | `/api/v1/ai/network/statistics` | Proxies graph centrality and network metrics | Bearer JWT |
| `GET` | `/api/v1/admin/users` | List platform users with pagination | Super Admin |
| `GET` | `/api/v1/admin/audit-logs` | Retrieve platform compliance audit logs | Admin / Super Admin |

*Interactive Swagger API documentation is available at `http://localhost:3001/docs` when running in development mode.*

---

## 🐳 Deployment

### Containerized Deployment (Docker Compose)

The repository includes production Dockerfiles for each microservice and a root `docker-compose.yml`:

```bash
# 1. Build and launch all containerized services in background
docker compose up -d --build

# 2. View running container status
docker compose ps

# 3. View unified logs
docker compose logs -f
```

### Production Build Verification
To verify that all packages and applications compile without errors:
```bash
# Builds shared packages, web client, and API gateway
npm run build
```

---

## 🔒 Security Policy

- **Zero Committed Secrets**: Real API keys, database credentials, JWT secrets, and Stripe private tokens must **never** be committed to version control.
- **Environment Isolation**: All configuration is injected via process environment variables adhering to the Twelve-Factor App methodology.
- **Cryptographic Protections**: Passwords hashed using Argon2id; webhooks validated using HMAC-SHA256 signatures (`whsec_...`).
- **Throttling & Rate Limiting**: Global rate-limiting guard configured at the API gateway layer (default 100 requests per 60 seconds per IP).
- **Tenant Isolation**: Database records strictly partitioned by `organizationId` and verified through middleware guards.

---

## 🧪 Testing & Quality Assurance

The repository includes test suites across both Node.js and Python microservices:

```bash
# Run Python AI unit and pipeline tests (54 passing tests)
cd apps/ai
python -m pytest

# Run NestJS API unit tests
npm run test -w apps/api

# Run end-to-end security and flow test suite
node test_e2e_security.js

# Run live system health check
node check_live_system.js
```

---

## 🛠️ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Prisma Connection Error** | PostgreSQL service not running or URL incorrect | Verify PostgreSQL is running on port 5432 and `DATABASE_URL` matches credentials. |
| **Stripe Checkout 400 Bad Request** | `STRIPE_SECRET_KEY` missing or invalid | Ensure a valid Stripe test key (starts with `sk_test_...`) is provided in `apps/api/.env`. |
| **AI Service Connection Refused** | Python FastAPI server not started | Launch AI service via `cd apps/ai && python main.py` on port 8000. |
| **Tailwind Styles Missing** | Corrupted `.next` dev cache | Stop server, run `rm -rf apps/web/.next`, and restart with `npm run dev`. |

---

## 📄 License & Project Status

- **License**: Proprietary — Developed for Enterprise Capital Flow Forecasting. All rights reserved.
- **Project Status**: **Production-Ready & Fully Verified**. All core forecasting, NLP extraction, network graph modeling, authentication, and subscription billing features are fully implemented, tested, and verified.
