import { useCallback } from 'react';

import { errorMessage } from '@/api/client';
import {
  useDecideRoutineUpdateMutation,
  useDeleteAllClientRoutinesMutation,
  useDeleteClientRoutineMutation,
} from '@/api/clientRoutines';
import { useClientSessionQuery, useTrainOverviewQuery } from '@/api/clientTraining';
import { LIErrorState, LISafeArea } from '@/components/ui';
import { formatToday } from '@/lib/format';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import TrainContent from '@/screens/train/TrainContent';
import TrainSkeleton from '@/screens/train/TrainSkeleton';
import { useClientSessionStore } from '@/store/clientSessionStore';
import { useUiStore } from '@/store/uiStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch and write for this screen happens here, once. */
export default function TrainScreen() {
  const overviewQuery = useTrainOverviewQuery();
  // Only runs while a workout is actually open — `enabled` guards the empty id.
  const activeSessionId = useClientSessionStore((state) => state.sessionId);
  const sessionQuery = useClientSessionQuery(activeSessionId ?? '');
  const { start, pendingPlanId } = useStartWorkout();

  const showToast = useUiStore((state) => state.showToast);
  const { mutate: deleteRoutine, isPending: deleting } = useDeleteClientRoutineMutation();
  const { mutate: deleteAllRoutines, isPending: deletingAll } =
    useDeleteAllClientRoutinesMutation();
  const {
    mutate: decideUpdate,
    isPending: deciding,
    variables: decidingVars,
  } = useDecideRoutineUpdateMutation();

  const refresh = useCallback(() => {
    void overviewQuery.refetch();
  }, [overviewQuery]);

  const handleDelete = useCallback(
    (routineId: string) => {
      deleteRoutine(routineId, {
        onError: (error) => showToast(errorMessage(error), 'danger'),
      });
    },
    [deleteRoutine, showToast],
  );

  const handleDecideUpdate = useCallback(
    (routineId: string, accept: boolean) => {
      decideUpdate(
        { routineId, accept },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [decideUpdate, showToast],
  );

  const handleDeleteAll = useCallback(() => {
    deleteAllRoutines(undefined, {
      onError: (error) => showToast(errorMessage(error), 'danger'),
    });
  }, [deleteAllRoutines, showToast]);

  if (overviewQuery.isPending) {
    return (
      <LISafeArea>
        <ScreenHeader title="Train" eyebrow={formatToday()} />
        <TrainSkeleton />
      </LISafeArea>
    );
  }

  if (overviewQuery.error || !overviewQuery.data) {
    return (
      <LISafeArea>
        <ScreenHeader title="Train" eyebrow={formatToday()} />
        <LIErrorState message={overviewQuery.error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader title="Train" eyebrow={formatToday()} />
      <TrainContent
        overview={overviewQuery.data}
        activeSession={sessionQuery.data ?? null}
        refreshing={overviewQuery.isRefetching}
        onRefresh={refresh}
        onStart={start}
        onDelete={handleDelete}
        onDeleteAll={handleDeleteAll}
        onDecideUpdate={handleDecideUpdate}
        decidingId={deciding ? (decidingVars?.routineId ?? null) : null}
        pendingPlanId={pendingPlanId}
        busy={pendingPlanId !== null || deleting || deletingAll}
      />
    </LISafeArea>
  );
}
