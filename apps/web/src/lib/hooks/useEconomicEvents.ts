import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api-client';

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  countryCode: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  date: string;
  time: string;
  forecast?: string;
  previous?: string;
  actual?: string;
  category: 'interest-rate' | 'employment' | 'inflation' | 'gdp' | 'trade' | 'manufacturing' | 'retail';
}

async function fetchEconomicEvents(): Promise<EconomicEvent[]> {
  try {
    const body: any = await apiClient.get('/v1/ai/events?size=30');
    if (!body.success) throw new Error(body.message || 'API failed');
    const items = body.data.items;

    if (!items || items.length === 0) {
      return [];
    }

    return items.map((item: any) => {
      let cat: EconomicEvent['category'] = 'gdp';
      const c = item.category?.toLowerCase() || '';
      if (c.includes('policy') || c.includes('rate')) cat = 'interest-rate';
      else if (c.includes('employ') || c.includes('labor')) cat = 'employment';
      else if (c.includes('inflation') || c.includes('cpi')) cat = 'inflation';
      else if (c.includes('trade')) cat = 'trade';
      else if (c.includes('manufactur') || c.includes('pmi')) cat = 'manufacturing';
      else if (c.includes('retail') || c.includes('consumer')) cat = 'retail';
      else if (c.includes('economic') || c.includes('gdp')) cat = 'gdp';

      const dateStr = item.event_date || item.created_at;
      const dateParts = dateStr.split('T');
      const date = dateParts[0];
      const time = dateParts[1] ? dateParts[1].substring(0, 5) + ' UTC' : '12:00 UTC';

      return {
        id: item.id,
        title: item.title,
        country: item.country || 'Global',
        countryCode: item.country ? item.country.substring(0, 2).toUpperCase() : 'GL',
        currency: item.currency || 'USD',
        impact: item.severity > 0.7 ? 'high' as const : item.severity > 0.4 ? 'medium' as const : 'low' as const,
        date,
        time,
        forecast: 'N/A',
        previous: 'N/A',
        actual: item.sentiment,
        category: cat
      };
    });
  } catch (err) {
    console.error('EconomicEvents: API failed', err);
    throw err;
  }
}

export function useEconomicEvents() {
  return useQuery({
    queryKey: ['dashboard', 'economic-events'],
    queryFn: fetchEconomicEvents,
    staleTime: 1000 * 60 * 10,
  });
}
