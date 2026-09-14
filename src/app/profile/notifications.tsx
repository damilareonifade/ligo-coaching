import { useCallback } from 'react';

import { useNotificationSettingsQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import NotificationsContent from '@/screens/profile-notifications/NotificationsContent';
import NotificationsSkeleton from '@/screens/profile-notifications/NotificationsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function NotificationsScreen() {
  const { data, isPending, error, refetch } = useNotificationSettingsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Notification settings"
          eyebrow="Preferences"
          backLabel="Profile"
        />
        <NotificationsSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Notification settings"
          eyebrow="Preferences"
          backLabel="Profile"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Notification settings"
        eyebrow="Preferences"
        backLabel="Profile"
      />
      <NotificationsContent settings={data} />
    </LISafeArea>
  );
}
