import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useClientRoutinesQuery } from '@/api/coachClient';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import RoutineBuilderContent from '@/screens/routine-builder/RoutineBuilderContent';
import RoutineSkeleton from '@/screens/routine-builder/RoutineSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * One client's copy, open in the builder.
 *
 * Composer only. The list the client holds is already a query on the review
 * screen, so this reads the same one rather than fetching a second time — the
 * routine is found in it by id.
 */
export default function ClientRoutineScreen() {
  const { id, routineId } = useLocalSearchParams<{ id: string; routineId: string }>();
  const routinesQuery = useClientRoutinesQuery(id ?? '');

  const refresh = useCallback(() => {
    void routinesQuery.refetch();
  }, [routinesQuery]);

  if (routinesQuery.isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Their routine"
          eyebrow="Client copy"
          backLabel="Client"
        />
        <RoutineSkeleton />
      </LISafeArea>
    );
  }

  const routine = routinesQuery.data?.routines.find((entry) => entry.id === routineId);

  if (routinesQuery.error || !routine) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Their routine"
          eyebrow="Client copy"
          backLabel="Client"
        />
        <LIErrorState
          message={routinesQuery.error?.message ?? 'That routine is no longer assigned.'}
          onRetry={refresh}
        />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Their routine"
        eyebrow="Client copy"
        backLabel="Client"
      />
      <RoutineBuilderContent routine={routine} clientId={id} />
    </LISafeArea>
  );
}
