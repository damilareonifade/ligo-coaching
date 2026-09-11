import { useCallback } from 'react';

import { useNotificationSettingsQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import NotificationsContent from '@/screens/profile-notifications/NotificationsContent';
import NotificationsSkeleton from '@/screens/profile-notifications/NotificationsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function NotificationsScreen() {
  const { data, isPending, error, refetch } = useNotificationSettingsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <NotificationsSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea edges={[]}>
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={[]}>
      <NotificationsContent settings={data} />
    </LISafeArea>
  );
}
