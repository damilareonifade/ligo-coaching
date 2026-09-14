import { useCallback } from 'react';

import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import LabelsContent from '@/screens/roster-labels/LabelsContent';
import LabelsSkeleton from '@/screens/roster-labels/LabelsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function LabelsScreen() {
  const { data, isPending, error, refetch, isRefetching } = useRosterQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Labels"
          eyebrow="Roster"
          backLabel="Settings"
        />
        <LabelsSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Labels"
          eyebrow="Roster"
          backLabel="Settings"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Labels"
        eyebrow="Roster"
        backLabel="Settings"
      />
      <LabelsContent roster={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
