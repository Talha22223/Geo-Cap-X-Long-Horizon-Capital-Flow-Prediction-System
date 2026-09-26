import { useQuery } from '@tanstack/react-query';

export interface ActivityItem {
  id: string;
  type: 'view' | 'export' | 'save' | 'share' | 'create' | 'alert';
  title: string;
  description?: string;
  href?: string;
  user?: string;
  timestamp: string;
  meta?: Record<string, string>;
}

async function fetchRecentActivity(): Promise<ActivityItem[]> {
  return [];
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: fetchRecentActivity,
    staleTime: 1000 * 60 * 2,
  });
}
