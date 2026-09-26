# GEOCAP-X — System Limitations & Boundary Constraints

## 1. Overview

GEOCAP-X is engineered as a defensible, multi-factor capital flow prediction platform. In accordance with strict software engineering and financial modeling practices, this document outlines the **genuine technical, data, and algorithmic limitations** of the platform.

---

## 2. External Provider & Rate Limit Constraints

1. **Free Tier API Rate Limits**:
   - **NewsAPI**: Limited to 100 requests per day on free developer tier.
   - **FRED API**: Requires an explicit API key for full series access; defaults to `NOT_CONFIGURED` gracefully when omitted.
   - **Yahoo Finance**: Subject to rate limiting and temporary IP throttling during high-frequency queries.
2. **Missing Market Data Fallback**: When external financial data is missing or unconfigured, the system returns `INSUFFICIENT_DATA` or `NOT_CONFIGURED` statuses rather than inventing fabricated prices.

---

## 3. Mathematical & Algorithmic Boundaries

1. **Rule-Based Heuristic Inference**: While NLP extraction and graph centralities are computed dynamically, the multi-horizon capital flow magnitude logic uses heuristic scaling rules calibrated against historical macro defaults rather than a full deep-learning black box.
2. **SciPy Optional Fallback**: If `scipy` is missing in the host Python runtime, PageRank and Eigenvector centralities fallback to pure NumPy power-iteration routines.
3. **Statistical Baseline Window**: Rolling Z-Score calculations require a minimum sample size of $N \ge 10$ historical daily bars. If fewer bars exist, abnormality status returns `INSUFFICIENT_HISTORY`.

---

## 4. Forecast Uncertainty & Backtesting Scope

1. **Exogenous Black Swan Events**: Long-horizon predictions (3Y–5Y) carry inherently higher variance and cannot anticipate unobserved exogenous shocks (e.g. unpredicted global health crises or sudden geopolitical regime shifts).
2. **Historical Analog Coverage**: Backtesting relies on recorded historical event clusters. Sparse coverage in specific emerging markets can reduce analog matching granularity.

---

## 5. Deployment & Hardware Requirements

1. **In-Memory Graph Construction**: NetworkX causal graph structures are currently computed in-memory per event chain. Very large event chains ($> 50,000$ nodes) require additional RAM or graph database scaling (e.g. Neo4j).
2. **PostgreSQL Connection Limits**: High-concurrency worker deployments require PgBouncer pooling for Neon/PostgreSQL connection management.
