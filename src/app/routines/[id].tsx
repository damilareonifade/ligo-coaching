import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useClientRoutineQuery } from '@/api/clientRoutines';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import RoutineBuilderContent from '@/screens/routine-builder/RoutineBuilderContent';
import RoutineSkeleton from '@/screens/routine-builder/RoutineSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routineQuery = useClientRoutineQuery(id ?? '');

  const refresh = useCallback(() => {
    void routineQuery.refetch();
  }, [routineQuery]);

  if (routineQuery.isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Routine"
          eyebrow="Your routine"
          backLabel="Back"
        />
        <RoutineSkeleton />
      </LISafeArea>
    );
  }

  if (routineQuery.error || !routineQuery.data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Routine"
          eyebrow="Your routine"
          backLabel="Back"
        />
        <LIErrorState message={routineQuery.error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Routine"
        eyebrow="Your routine"
        backLabel="Back"
      />
      <RoutineBuilderContent routine={routineQuery.data} />
    </LISafeArea>
  );
}
