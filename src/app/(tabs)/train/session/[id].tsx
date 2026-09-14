import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useClientSessionQuery } from '@/api/clientTraining';
import { LIErrorState, LISafeArea } from '@/components/ui';
import SessionContent from '@/screens/session/SessionContent';
import SessionSkeleton from '@/screens/session/SessionSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only: every fetch for this screen happens here, once.
 *
 * Keeps the default top inset — unlike every other route in this stack the
 * workout draws its own header, so nothing above it is reserving that space.
 */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionQuery = useClientSessionQuery(id ?? '');

  const refresh = useCallback(() => {
    void sessionQuery.refetch();
  }, [sessionQuery]);

  if (sessionQuery.isPending) {
    return (
      <LISafeArea>
        <SessionSkeleton />
      </LISafeArea>
    );
  }

  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <LISafeArea>
        <LIErrorState message={sessionQuery.error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <SessionContent session={sessionQuery.data} />
    </LISafeArea>
  );
}
