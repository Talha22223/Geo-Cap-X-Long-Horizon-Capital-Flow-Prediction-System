# GEOCAP-X — Demonstration & Live Presentation Guide

## 1. Objective

This guide provides evaluators, project reviewers, and interviewers with a step-by-step procedure to demonstrate and test the live, end-to-end capabilities of GEOCAP-X.

---

## 2. Pre-Demonstration Checklist

- [x] Node.js v20+ and Python 3.11+ installed.
- [x] Database initialized and verified (`python -m pytest` passes 54/54 tests).
- [x] Next.js web application built and running on `http://localhost:3000`.
- [x] Python AI Engine running on `http://localhost:8000`.

---

## 3. Step-by-Step Presentation Script

### Step 1: Platform Overview (`/dashboard`)
1. Open browser to `http://localhost:3000/dashboard`.
2. **Key Highlight**: Point out live summary metrics (Total Processed Events, Causal Graph Network Nodes, Multi-Horizon Capital Flow Predictions).
3. **Data Freshness Tracker**: Click on the Data Freshness badge to demonstrate live provenance tracking across Observed, Derived, and Inferred datasets.

### Step 2: Ingested Geopolitical Events (`/events`)
1. Navigate to `http://localhost:3000/events`.
2. Inspect the live event stream feed showing NLP entity extractions (Country, Sector, Category, Sentiment, Confidence score).
3. Click on a specific event (e.g. *Fed Rate Hike* or *BRICS Energy Policy*) to view source metadata and supporting article lineage.

### Step 3: Capital Flow Rotation Predictions (`/predictions` & `/flows`)
1. Navigate to `http://localhost:3000/predictions`.
2. Filter predictions by horizon (**6M**, **1Y**, **3Y**, **5Y**).
3. Point out the $ USD Bn magnitude inflow/outflow directional forecasts, asset class rotation targets, and confidence breakdown bars.

### Step 4: Causal Network Graph & SNA (`/visualizations`)
1. Navigate to `http://localhost:3000/visualizations`.
2. View the interactive Causal Event Graph network.
3. Highlight SNA Centrality calculations:
   - **PageRank Centrality**: Identifies high-impact market systemic nodes.
   - **Betweenness Centrality**: Highlights bridge events connecting disparate geopolitical regions.

### Step 5: Real Market Confirmation & Technical Indicators (`/technical` & `/market`)
1. Navigate to `http://localhost:3000/market`.
2. Inspect real-world market observations (SPY, AAPL, Gold, Emerging Market ETFs).
3. Point out the Statistical Abnormality Z-Score calculations validating whether capital flow rotations match observed market volume/price anomalies.

### Step 6: Forecast Validation & Point-in-Time Calibration (`/validation`)
1. Navigate to `http://localhost:3000/validation`.
2. Review the Point-in-Time Backtesting engine results.
3. Emphasize model honesty: Show historical analog accuracy metrics and calibration error graphs proving no lookahead bias occurred.

---

## 4. Troubleshooting During Live Demonstration

- **If an external API key is unconfigured**: The system displays `NOT_CONFIGURED` or `INSUFFICIENT_DATA` badges cleanly without throwing visual errors or crashing.
- **If graph visualization is slow**: Toggle the network view filter to display top-centrality nodes ($N=20$) for optimal rendering performance.
