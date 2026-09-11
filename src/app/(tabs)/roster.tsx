import { useCallback } from 'react';

import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import RosterContent from '@/screens/roster/RosterContent';
import RosterSkeleton from '@/screens/roster/RosterSkeleton';
import RosterTitle from '@/screens/roster/RosterTitle';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — one query, handed down; the filters are RosterContent's. */
export default function RosterScreen() {
  const { data, isPending, error, refetch, isRefetching } = useRosterQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <RosterTitle />
        <RosterSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <RosterTitle />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <RosterTitle />
      <RosterContent roster={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
