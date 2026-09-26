/**
 * Hook for GEOCAP-X V8.1 Unified Explainability, Provenance & Trust Layer.
 */
'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '../api-client';

export interface TraceabilityStage {
  stage_index: number;
  stage_name: string;
  record_id: string;
  timestamp: string;
  status: string;
  summary: string;
}

export interface SourceProvenanceData {
  provider: string;
  external_id?: string | null;
  source_url?: string | null;
  published_at?: string | null;
  ingestion_timestamp?: string | null;
  processing_timestamp?: string | null;
  data_origin: string;
  methodology_version: string;
  data_quality_score: number;
  status: string;
}

export interface DataFreshnessData {
  freshness_status: 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';
  freshness_age_hours?: number | null;
  threshold_hours: number;
  stale_threshold_hours?: number | null;
  is_usable: boolean;
  summary: string;
}

export interface SeparatedConfidenceData {
  extraction_confidence: number;
  classification_confidence: number;
  relationship_confidence: number;
  graph_centrality_score: number;
  market_baseline_quality: number;
  market_signal_strength: number;
  scenario_confidence: number;
  fused_overall_score: number;
  methodology: string;
}

export interface ExplanationDetail {
  event_id?: string;
  forecast_id?: string;
  title?: string;
  category?: string;
  severity?: number;
  result_summary: string;
  provenance?: SourceProvenanceData | null;
  data_freshness?: DataFreshnessData | null;
  traceability_chain: TraceabilityStage[];
  inputs_used: Record<string, any>;
  calculations_breakdown: Record<string, any>;
  confidence_breakdown?: SeparatedConfidenceData | null;
  conflict_analysis?: Record<string, any>;
  supporting_evidence: string[];
  opposing_evidence: string[];
  methodology_versions: Record<string, string>;
  limitations: string[];
  is_traceable: boolean;
}

export function useExplainability() {
  const [explanation, setExplanation] = useState<ExplanationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEventExplanation = useCallback(async (eventId: string): Promise<ExplanationDetail | null> => {
    setLoading(true);
    setError(null);
    try {
      const body: any = await apiClient.get(`/v1/ai/explain/event/${eventId}`);
      if (body.success) {
        setExplanation(body.data);
        return body.data;
      }
      return null;
    } catch (err: any) {
      setError(err.message ?? 'Failed to load event explanation');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getForecastExplanation = useCallback(async (forecastId: string): Promise<ExplanationDetail | null> => {
    setLoading(true);
    setError(null);
    try {
      const body: any = await apiClient.get(`/v1/ai/explain/forecast/${forecastId}`);
      if (body.success) {
        setExplanation(body.data);
        return body.data;
      }
      return null;
    } catch (err: any) {
      setError(err.message ?? 'Failed to load forecast explanation');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    explanation,
    loading,
    error,
    getEventExplanation,
    getForecastExplanation,
  };
}
