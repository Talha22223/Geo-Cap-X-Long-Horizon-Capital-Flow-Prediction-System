# GEOCAP-X — Setup, Installation & Database Reproducibility Guide

## 1. Prerequisites

Before deploying or running GEOCAP-X locally, ensure the following tools are installed:

- **Node.js**: v20.x or later (`node -v`)
- **Python**: v3.11 or later (`python --version`)
- **PostgreSQL**: v15.x or Neon Cloud PostgreSQL (`psql --version`)
- **Redis**: v7.x (`redis-cli -v`) (Optional for basic API, required for background queues)

---

## 2. Environment Configuration

Copy the example environment configurations in the workspace root and microservices:

```bash
# Workspace Root Environment
cp .env.example .env

# Web Frontend Environment
cp apps/web/.env.example apps/web/.env.local

# FastAPI AI Engine Environment
cp apps/ai/.env.example apps/ai/.env

# NestJS API Gateway Environment
cp apps/api/.env.example apps/api/.env
```

### Key Environment Variables Summary

| Service | Variable | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| Core | `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` | Async/Sync PostgreSQL connection URI |
| Core | `REDIS_URL` | `redis://localhost:6379/1` | Redis caching & queue connection string |
| Web | `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | NestJS Gateway public endpoint |
| Web | `NEXT_PUBLIC_AI_URL` | `http://localhost:8000` | FastAPI AI Microservice public endpoint |
| AI Engine | `NEWSAPI_KEY` | `your_newsapi_key_here` | (Optional) Live NewsAPI ingestion key |
| AI Engine | `FRED_API_KEY` | `your_fred_api_key_here` | (Optional) St. Louis Fed liquidity key |

---

## 3. Database Initialization & Migrations

GEOCAP-X uses **Prisma ORM** for NestJS API Gateway models and **SQLAlchemy / Alembic** for Python AI Engine async models.

### Step 3.1 — Prisma ORM Setup (NestJS API)

```bash
# Navigate to API Gateway app
cd apps/api

# Install dependencies & generate Prisma Client
npm install
npx prisma generate --schema=prisma/schema.prisma

# Apply Database Schema Migrations
npx prisma db push --schema=prisma/schema.prisma

# Seed Initial Roles & Default Administrator Account
npm run seed
```

### Step 3.2 — SQLAlchemy Schema Setup (Python AI Engine)

```bash
# Navigate to Python AI Engine app
cd apps/ai

# Install Python virtual environment & dependencies
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run Database Schema Setup & Seed Pipelines
python -m pytest apps/ai/tests/test_ingestion.py
```

---

## 4. Service Startup & Verification Commands

### Development Mode

```bash
# 1. Start NestJS API Gateway (Port 3001)
npm run dev:api

# 2. Start Python FastAPI AI Engine (Port 8000)
cd apps/ai
python main.py

# 3. Start Next.js 15 Web Application (Port 3000)
npm run dev:web
```

### Production Build & Deployment

```bash
# 1. Build Shared TypeScript Packages
npm run build:shared

# 2. Build Next.js Web Frontend
cd apps/web
npm run build
npm run start

# 3. Launch FastAPI Engine with Uvicorn Production Workers
cd apps/ai
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 5. Automated System Test Suite Execution

Run the complete 54-item Python unit, integration, and E2E test suite:

```bash
# Run all tests from workspace root
python -m pytest
```

*Expected Result:* `54 passed in ~160s (100% PASS)`
