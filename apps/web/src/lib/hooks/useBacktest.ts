/**
 * Hook for GEOCAP-X V7.2 Forecast Validation, Backtesting & Calibration.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api-client';

export interface ConfusionMatrix {
  true_inflows: number;
  true_outflows: number;
  false_inflows: number;
  false_outflows: number;
  precision: number;
  recall: number;
}

export interface CalibrationBucket {
  confidence_bucket: string;
  prediction_count: number;
  observed_accuracy: number;
  calibration_gap: number;
}

export interface BaselineComparison {
  geocap_directional_accuracy: number;
  naive_persistence_accuracy: number;
  sector_average_accuracy: number;
  information_gain_delta: number;
  sample_size: number;
  baselines_evaluated: Array<{
    name: string;
    accuracy: number;
    description: string;
  }>;
  conclusion: string;
}

export interface ForecastComparison {
  id?: string;
  event_title: string;
  event_date: string;
  category: string;
  sector?: string | null;
  region?: string | null;
  cutoff_timestamp: string;
  predicted_direction: string;
  predicted_confidence: number;
  actual_direction: string;
  directional_match: boolean;
  error_classification?: string | null;
  evidence_summary?: string | null;
}

export interface BacktestResult {
  id: string;
  status: string;
  methodology_version: string;
  dataset_version: string;
  total_events_tested: number;
  directional_accuracy: number;
  confusion_matrix: ConfusionMatrix;
  calibration_curve: CalibrationBucket[];
  baseline_comparison: BaselineComparison;
  leakage_test_status: string;
  sample_composition: {
    total_historical_events: number;
    category_breakdown: Record<string, number>;
    sector_breakdown: Record<string, number>;
    region_breakdown: Record<string, number>;
  };
  error_diagnostics_count: number;
  comparisons: ForecastComparison[];
  created_at?: string;
}

export function useBacktest() {
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: any = await apiClient.get('/v1/ai/backtest/results');
      if (body.success) {
        setBacktestResult(body.data);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load backtest results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const runBacktest = useCallback(async (horizons?: string[]) => {
    setLoading(true);
    try {
      const body: any = await apiClient.post('/v1/ai/backtest/run', {
        horizons: horizons || ['SHORT_TERM', 'MEDIUM_TERM'],
      });
      if (body.success) {
        setBacktestResult(body.data);
      }
      return body;
    } catch (err: any) {
      console.error('Failed to execute backtest:', err);
      setError(err.message ?? 'Failed to execute backtest');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const runLeakageTest = useCallback(async () => {
    try {
      const body: any = await apiClient.get('/v1/ai/backtest/leakage-test');
      return body.success ? body.data : null;
    } catch (err) {
      console.error('Failed to run leakage test:', err);
      return null;
    }
  }, []);

  return {
    backtestResult,
    loading,
    error,
    refetch: fetchResults,
    runBacktest,
    runLeakageTest,
  };
}
