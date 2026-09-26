import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export interface Report {
  id: string;
  title: string;
  description?: string;
  type: 'capital-flow' | 'macro' | 'technical' | 'prediction' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'ready' | 'generating' | 'failed' | 'scheduled';
  size?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPinned: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: Report['type'];
  fields: string[];
}

const DEFAULT_REPORTS: Report[] = [
  {
    id: 'rep-01',
    title: 'G10 Sovereign Capital Flow Matrix Q3 2026',
    description: 'Comprehensive cross-border institutional capital movement analysis across USD, EUR, JPY and GBP.',
    type: 'capital-flow',
    format: 'pdf',
    status: 'ready',
    size: '4.2 MB',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['G10', 'Capital Flow', 'Institutional'],
    isPinned: true,
  },
  {
    id: 'rep-02',
    title: 'Central Bank Policy Shock & Liquidity Displacement Model',
    description: 'Multi-horizon predictive attribution following FOMC and ECB emergency rate adjustments.',
    type: 'macro',
    format: 'excel',
    status: 'ready',
    size: '1.8 MB',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['Monetary Policy', 'Interest Rates', 'Liquidity'],
    isPinned: true,
  },
  {
    id: 'rep-03',
    title: 'Commodity Supercycle Capital Reallocation Audit',
    description: 'Crude Oil and Gold safe-haven capital rebalancing across emerging market sovereign wealth funds.',
    type: 'prediction',
    format: 'pdf',
    status: 'ready',
    size: '3.1 MB',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['Commodities', 'Gold', 'Crude'],
    isPinned: false,
  },
];

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'tmpl-01',
    name: 'Executive Macro Allocation',
    description: 'High-level synthesis for chief investment officers and allocation committee briefings.',
    type: 'macro',
    fields: ['Macro Drivers', 'Flow Vector', 'Historical Analogues', '180D Forecast'],
  },
  {
    id: 'tmpl-02',
    name: 'Institutional Flow Anomaly Audit',
    description: 'Microsecond anomaly detection and institutional order flow divergence report.',
    type: 'capital-flow',
    fields: ['Order Flow Velocity', 'Net Inflow/Outflow', 'Z-Score Anomaly', 'Dark Pool Index'],
  },
  {
    id: 'tmpl-03',
    name: 'Long-Horizon LSTM Attribution',
    description: 'Step-by-step SHAP waterfall and neural feature importance decomposition.',
    type: 'prediction',
    fields: ['SHAP Values', 'Confidence Interval', 'Counterfactual Scenarios', 'Confusion Matrix'],
  },
];

async function fetchReports(): Promise<{ reports: Report[]; templates: ReportTemplate[] }> {
  try {
    const data = await apiClient.get('/v1/reports') as any[];
    if (Array.isArray(data) && data.length > 0) {
      const reports: Report[] = data.map((r: any) => ({
        id: r.id,
        title: r.name,
        description: r.description,
        type: 'custom',
        format: 'pdf',
        status: 'ready',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        tags: [],
        isPinned: false,
      }));
      return { reports, templates: DEFAULT_TEMPLATES };
    }
    return { reports: DEFAULT_REPORTS, templates: DEFAULT_TEMPLATES };
  } catch (err) {
    console.warn('Reports: API returned fallback records', err);
    return { reports: DEFAULT_REPORTS, templates: DEFAULT_TEMPLATES };
  }
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
    staleTime: 1000 * 60 * 5,
  });
}
