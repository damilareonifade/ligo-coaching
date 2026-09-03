import { useCallback } from 'react';

import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import LabelsContent from '@/screens/roster-labels/LabelsContent';
import LabelsSkeleton from '@/screens/roster-labels/LabelsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function LabelsScreen() {
  const { data, isPending, error, refetch, isRefetching } = useRosterQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <LabelsSkeleton />
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
      <LabelsContent roster={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
