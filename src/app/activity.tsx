import { useCallback } from 'react';

import { useActivityQuery } from '@/api/coachActivity';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ActivityContent from '@/screens/activity/ActivityContent';
import ActivitySkeleton from '@/screens/activity/ActivitySkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function ActivityScreen() {
  const { data, isPending, error, refetch, isRefetching } = useActivityQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <ActivitySkeleton />
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
      <ActivityContent groups={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
