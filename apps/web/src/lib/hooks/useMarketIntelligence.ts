/**
 * Hook for fetching live market observations, derived activity proxies, and data source status.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api-client';

export interface MarketObservationItem {
  instrument_symbol: string;
  asset_class: string;
  market: string;
  timestamp: string;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number | null;
  volume: number | null;
  currency: string;
  source: string;
  data_quality: number;
  data_origin: string;
}

export interface MarketSignalItem {
  indicator_name: string;
  category: string;
  value: number;
  z_score: number | null;
  formula: string;
  source_variables: any;
  time_window: string;
  calculation_timestamp: string;
  methodology_version: string;
}

export interface DataSourceStatusItem {
  provider_name: string;
  category: string;
  status: 'ACTIVE' | 'NOT_CONFIGURED' | 'UNAVAILABLE';
  error_message: string | null;
  data_freshness_seconds: number | null;
}

export function useMarketIntelligence(symbol?: string) {
  const [observations, setObservations] = useState<MarketObservationItem[]>([]);
  const [signals, setSignals] = useState<MarketSignalItem[]>([]);
  const [sourcesStatus, setSourcesStatus] = useState<DataSourceStatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sym = symbol || 'SPY';
      const [obsRes, sigRes, srcRes]: any[] = await Promise.all([
        apiClient.get(`/v1/ai/market/observations?symbol=${encodeURIComponent(sym)}&limit=30`),
        apiClient.get(`/v1/ai/market/signals?symbol=${encodeURIComponent(sym)}`),
        apiClient.get('/v1/ai/market/sources/status')
      ]);

      if (obsRes?.success) setObservations(Array.isArray(obsRes.data) ? obsRes.data : []);
      if (sigRes?.success) setSignals(Array.isArray(sigRes.data) ? sigRes.data : []);
      if (srcRes?.success) setSourcesStatus(Array.isArray(srcRes.data) ? srcRes.data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch market intelligence data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return {
    observations,
    signals,
    sourcesStatus,
    loading,
    error,
    refetch: fetchMarketData
  };
}
