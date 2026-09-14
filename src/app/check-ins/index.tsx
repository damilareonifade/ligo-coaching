import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useCheckInsQuery } from '@/api/clientCheckIns';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import CheckInsContent from '@/screens/check-ins/CheckInsContent';
import CheckInsSkeleton from '@/screens/check-ins/CheckInsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the header owns the top inset, so no safe-area edges here.
 *
 * `clientId` is set when a coach opens a client's check-ins from the review.
 * Absent, it is the client reading their own. Everything below reads the same
 * screen; only who it is about changes.
 */
export default function CheckInsScreen() {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { data, isPending, error, refetch, isRefetching } = useCheckInsQuery(clientId);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Check-ins"
          eyebrow="Monthly"
          backLabel="Back"
        />
        <CheckInsSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Check-ins"
          eyebrow="Monthly"
          backLabel="Back"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Check-ins"
        eyebrow="Monthly"
        backLabel="Back"
      />
      <CheckInsContent
        checkIns={data}
        clientId={clientId}
        refreshing={isRefetching}
        onRefresh={refresh}
      />
    </LISafeArea>
  );
}
