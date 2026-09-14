import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useLiveSessionQuery } from '@/api/coachClient';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import LiveContent from '@/screens/live-session/LiveContent';
import LiveEndedState from '@/screens/live-session/LiveEndedState';
import LiveSkeleton from '@/screens/live-session/LiveSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only. `null` data is a session that ended, not a failure — it gets
 * the ended state, and only a thrown error gets `LIErrorState`.
 */
export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id ?? '';

  const { data, isPending, error, refetch, isRefetching } = useLiveSessionQuery(clientId);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Live session"
          eyebrow="Watching now"
          backLabel="Client"
        />
        <LiveSkeleton />
      </LISafeArea>
    );
  }

  if (error) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Live session"
          eyebrow="Watching now"
          backLabel="Client"
        />
        <LIErrorState message={error.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  if (!data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Live session"
          eyebrow="Watching now"
          backLabel="Client"
        />
        <LiveEndedState clientId={clientId} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Live session"
        eyebrow="Watching now"
        backLabel="Client"
      />
      <LiveContent session={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
