/**
 * Hook for fetching V6.2 4-layer signal fusion results and interpretation status.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api-client';

export interface Layer1EventSignal {
  event_id: string;
  event_title: string;
  event_category: string;
  event_severity: number;
  extraction_confidence: number;
  classification_confidence: number;
  overall_confidence: number;
  affected_countries: string[];
  affected_regions: string[];
  affected_sectors: string[];
  layer_score: number;
}

export interface Layer2NetworkSignal {
  network_exposure_score: number;
  directly_exposed_count: number;
  indirectly_exposed_count: number;
  bridge_events_traversed: string[];
  top_path_confidence: number;
  layer_score: number;
}

export interface Layer3MarketSignal {
  instrument_symbol: string;
  asset_class: string;
  pre_event_baseline_mean: number | null;
  pre_event_baseline_std: number | null;
  event_day_value: number | null;
  post_event_value: number | null;
  abnormal_z_score: number | null;
  market_signal_score: number;
  layer_score: number;
}

export interface Layer4DataQuality {
  data_quality_score: number;
  historical_observation_count: number;
  independent_sources_count: number;
  supporting_sources: string[];
  data_freshness_seconds: number;
  is_sufficient_history: boolean;
}

export interface FusedIntelligenceResult {
  event_id: string;
  instrument_symbol: string;
  observation_window: string;
  layer1_event_signal: Layer1EventSignal;
  layer2_network_signal: Layer2NetworkSignal;
  layer3_market_signal: Layer3MarketSignal;
  layer4_data_quality: Layer4DataQuality;
  fused_signal_score: number;
  interpretation_status: 'ALIGNED_HIGH_CONFIDENCE' | 'MIXED_EVIDENCE' | 'UNCONFIRMED_EVENT_SIGNAL' | 'UNMAPPED_MARKET_ANOMALY' | 'INSUFFICIENT_EVIDENCE';
  cross_asset_alignment_json: any;
  methodology_version: string;
  generated_at: string;
}

export function useSignalFusion(eventId?: string) {
  const [intelligence, setIntelligence] = useState<FusedIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(`/v1/ai/market-intelligence/event/${eventId}`);
      if (res?.success) {
        setIntelligence(res.data);
      } else {
        setError(res?.message || 'Failed to load fused market intelligence');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching fused signal intelligence');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  return {
    intelligence,
    loading,
    error,
    refetch: fetchIntelligence
  };
}
