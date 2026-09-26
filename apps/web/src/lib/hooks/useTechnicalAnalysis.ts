/**
 * Hook for fetching technical analysis data from the AI service.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

import { apiClient } from '../api-client';

export interface OHLCVBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  sma_20: (number | null)[];
  sma_50: (number | null)[];
  sma_200: (number | null)[];
  ema_9: (number | null)[];
  ema_20: (number | null)[];
  ema_50: (number | null)[];
  rsi_14: (number | null)[];
  macd: { line: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };
  bollinger_bands: { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] };
  atr_14: (number | null)[];
  vwap: number[];
  obv: number[];
  adx: { adx: (number | null)[]; plus_di: (number | null)[]; minus_di: (number | null)[] };
  stoch_rsi: { k: (number | null)[]; d: (number | null)[] };
  ichimoku: Record<string, (number | null)[]>;
  fibonacci: Record<string, number>;
  volume_profile: { price_low: number; price_high: number; volume: number }[];
  last_price: number;
  last_volume: number;
}

export interface MarketStructure {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE' | 'CONSOLIDATING';
  trend_strength: number;
  support_resistance_levels: number[];
  swing_highs: { index: number; price: number; type: string }[];
  swing_lows: { index: number; price: number; type: string }[];
  breakouts: { type: string; level: number; price: number; volume_confirmed: boolean; volume_ratio: number }[];
}

export interface PatternMatch {
  found: boolean;
  pattern_name: string;
  pattern_type: 'BULLISH' | 'BEARISH';
  confidence: number;
  points: number[];
  target_price: number;
}

export interface TimeframeReport {
  timeframe: string;
  last_price: number;
  last_volume: number;
  indicators: IndicatorData;
  market_structure: MarketStructure;
  detected_patterns: PatternMatch[];
  ohlcv?: OHLCVBar[];
}

export interface MTFAlignment {
  timeframe_alignment: Record<string, string>;
  alignment_score: number;
  mtf_confidence: number;
  primary_trend: string;
}

export interface TechnicalReport {
  symbol: string;
  timestamp: string;
  timeframe_reports: Record<string, TimeframeReport>;
  multi_timeframe_alignment: MTFAlignment;
}

export interface TechnicalExplanation {
  symbol: string;
  primary_signal: string;
  confidence: number;
  technical_reasoning: string;
  indicator_confirmations: string[];
  capital_flow_reasoning: string;
  alternative_scenarios: { scenario: string; probability: number; description: string }[];
  risk_factors: string[];
  historical_context?: string;
}

export function useTechnicalAnalysis(symbol: string, timeframes?: string) {
  const [report, setReport] = useState<TechnicalReport | null>(null);
  const [explanation, setExplanation] = useState<TechnicalExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const params = timeframes ? `?timeframes=${encodeURIComponent(timeframes)}` : '';
      const [reportData, explainData] = await Promise.all([
        apiClient.get(`/v1/ai/technical/${symbol.toUpperCase()}${params}`) as Promise<any>,
        apiClient.post(`/v1/ai/technical/${symbol.toUpperCase()}/explain`) as Promise<any>,
      ]);

      if (reportData?.success) setReport(reportData.data);
      if (explainData?.success) setExplanation(explainData.data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load technical analysis');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { report, explanation, loading, error, refetch: fetchData };
}
