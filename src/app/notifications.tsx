import { useCallback } from 'react';

import { useNotificationsQuery } from '@/api/notifications';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import { LIErrorState, LISafeArea } from '@/components/ui';
import NotificationsContent from '@/screens/notifications/NotificationsContent';
import NotificationsSkeleton from '@/screens/notifications/NotificationsSkeleton';
import { useAuthStore } from '@/store/authStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * What the bell on Today opens, on both sides of the app.
 *
 * One screen, not two. The coach's feed used to be called Activity and the
 * client's Notifications, which made them look like different things — but an
 * activity update *is* a notification: "Maya finished Upper A" and "Sam
 * assigned you Upper A" are the same event read from opposite ends.
 *
 * Not `/profile/notifications`, which is the switches that decide which of
 * these also reach the phone.
 */
export default function NotificationsScreen() {
  const isCoach = useAuthStore((state) => state.user?.role) === 'coach';
  const { data, isPending, error, refetch, isRefetching } = useNotificationsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <LISafeArea>
      <ScreenHeader
        title="Notifications"
        eyebrow={isCoach ? 'Your clients' : 'From your coach'}
        backLabel="Today"
      />

      {isPending ? <NotificationsSkeleton /> : null}

      {!isPending && (error || !data) ? (
        <LIErrorState message={error?.message} onRetry={refresh} />
      ) : null}

      {!isPending && data ? (
        <NotificationsContent
          groups={data}
          isCoach={isCoach}
          refreshing={isRefetching}
          onRefresh={refresh}
        />
      ) : null}
    </LISafeArea>
  );
}
