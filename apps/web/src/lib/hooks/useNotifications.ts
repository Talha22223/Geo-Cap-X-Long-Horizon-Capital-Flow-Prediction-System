import { useQuery } from '@tanstack/react-query';
import { useNotificationStore, type AppNotification } from '../store/notificationStore';

async function fetchNotifications(stored: AppNotification[]): Promise<AppNotification[]> {
  // Phase 5: merge with real-time server-side notifications
  await new Promise((r) => setTimeout(r, 100));
  return stored;
}

export function useNotifications() {
  const { notifications } = useNotificationStore();
  return useQuery({
    queryKey: ['notifications', notifications.length],
    queryFn: () => fetchNotifications(notifications),
    staleTime: 1000 * 30,
    initialData: notifications,
  });
}
