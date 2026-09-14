import { useCallback } from 'react';

import { useClientSessionQuery, useTrainOverviewQuery } from '@/api/clientTraining';
import { LIErrorState, LISafeArea } from '@/components/ui';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import TrainContent from '@/screens/train/TrainContent';
import TrainSkeleton from '@/screens/train/TrainSkeleton';
import { useClientSessionStore } from '@/store/clientSessionStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function TrainScreen() {
  const overviewQuery = useTrainOverviewQuery();
  // Only runs while a workout is actually open — `enabled` guards the empty id.
  const activeSessionId = useClientSessionStore((state) => state.sessionId);
  const sessionQuery = useClientSessionQuery(activeSessionId ?? '');
  const { start, isPending: starting } = useStartWorkout();

  const refresh = useCallback(() => {
    void overviewQuery.refetch();
  }, [overviewQuery]);

  if (overviewQuery.isPending) {
    return (
      <LISafeArea>
        <TrainSkeleton />
      </LISafeArea>
    );
  }

  if (overviewQuery.error || !overviewQuery.data) {
    return (
      <LISafeArea>
        <LIErrorState message={overviewQuery.error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <TrainContent
        overview={overviewQuery.data}
        activeSession={sessionQuery.data ?? null}
        refreshing={overviewQuery.isRefetching}
        onRefresh={refresh}
        onStart={start}
        starting={starting}
      />
    </LISafeArea>
  );
}
