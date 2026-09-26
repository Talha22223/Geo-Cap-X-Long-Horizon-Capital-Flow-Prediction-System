/**
 * Hook for fetching GEOCAP-X V7.1 Multi-Horizon Scenario Forecasts, Scenarios, Evidence & Analogues.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api-client';

export interface ForecastScenario {
  scenario_id?: string;
  type: 'CONTINUATION' | 'ESCALATION' | 'DE-ESCALATION';
  title: string;
  description: string;
  assumptions: string[];
  supporting_evidence: string[];
  opposing_evidence: string[];
  affected_sectors_assets: string[];
  relevant_network_paths: string[];
  uncertainty: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scenario_confidence: number;
}

export interface ForecastAnalogue {
  historical_event_title: string;
  historical_date: string;
  similarity_score: number;
  similarity_method: string;
  matching_attributes: string[];
  observed_outcome: string;
  source: string;
}

export interface ForecastSensitivity {
  baseline_confidence: number;
  primary_sensitivity_driver: string;
  sensitivity_breakdown: Array<{
    factor: string;
    confidence_delta: number;
    impact_level: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  }>;
}

export interface MultiHorizonForecastItem {
  id: string;
  event_id: string;
  horizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  status: 'SUFFICIENT_EVIDENCE' | 'INSUFFICIENT_EVIDENCE';
  confidence_state: string;
  overall_confidence: number;
  estimated_rotation_usd_bn: number;
  direction?: 'INFLOW' | 'OUTFLOW' | null;
  affected_country?: string | null;
  affected_region?: string | null;
  affected_sector?: string | null;
  asset_class?: string | null;
  primary_sensitivity_driver?: string | null;
  methodology_version: string;
  data_snapshot?: {
    has_market_data: boolean;
    has_network_data: boolean;
    has_historical_analogues: boolean;
    event_state: string;
    network_state: string;
    market_state: string;
    historical_state: string;
  };
  sensitivity?: ForecastSensitivity | null;
  scenarios: ForecastScenario[];
  analogues: ForecastAnalogue[];
  created_at?: string;
}

export function useMultiHorizonForecasts(filters?: { horizon?: string; eventId?: string }) {
  const [forecasts, setForecasts] = useState<MultiHorizonForecastItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecasts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/v1/ai/forecast/by-horizon?horizon=SHORT_TERM';
      if (filters?.horizon && filters.horizon !== 'ALL') {
        let hz = filters.horizon.toUpperCase();
        if (hz === '6M' || hz === 'SHORT') hz = 'SHORT_TERM';
        else if (hz === '1Y' || hz === 'MEDIUM') hz = 'MEDIUM_TERM';
        else if (hz === '3Y' || hz === '5Y' || hz === 'LONG') hz = 'LONG_TERM';
        endpoint = `/v1/ai/forecast/by-horizon?horizon=${hz}`;
      } else if (filters?.eventId) {
        endpoint = `/v1/ai/forecast/event/${filters.eventId}`;
      }

      const body: any = await apiClient.get(endpoint);
      if (body.success) {
        setForecasts(body.data || []);
      } else {
        setForecasts([]);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load multi-horizon forecasts');
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.horizon, filters?.eventId]);

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  const generateForecast = useCallback(async (eventId: string, horizons?: string[]) => {
    try {
      const body: any = await apiClient.post('/v1/ai/forecast/generate', {
        event_id: eventId,
        horizons: horizons || ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'],
      });
      return body;
    } catch (err) {
      console.error('Failed to trigger forecast generation:', err);
      throw err;
    }
  }, []);

  return {
    forecasts,
    loading,
    error,
    refetch: fetchForecasts,
    generateForecast,
  };
}

// Backward compatibility alias hook
export function usePredictions(filters?: { horizon?: string; country?: string }) {
  const { forecasts, loading, error, refetch, generateForecast } = useMultiHorizonForecasts({
    horizon: filters?.horizon,
  });

  return {
    forecasts,
    predictions: forecasts,
    total: forecasts.length,
    loading,
    error,
    refetch,
    generatePrediction: async (hz: string) => generateForecast('seed_event_1', [hz]),
    getExplanation: async () => null,
  };
}
