import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useCheckInsQuery } from '@/api/clientCheckIns';
import { LIErrorState, LISafeArea } from '@/components/ui';
import CheckInEditForm from '@/screens/check-in-edit/CheckInEditForm';
import CheckInEditSkeleton from '@/screens/check-in-edit/CheckInEditSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only. The list is the source of the prefill, so the same query backs
 * both screens — arriving from the list it is already cached and never blanks.
 */
export default function CheckInEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isPending, error, refetch } = useCheckInsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <CheckInEditSkeleton />
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
      <CheckInEditForm checkIns={data} id={id} />
    </LISafeArea>
  );
}
