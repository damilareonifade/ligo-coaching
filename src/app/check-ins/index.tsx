import { useCallback } from 'react';

import { useCheckInsQuery } from '@/api/clientCheckIns';
import { LIErrorState, LISafeArea } from '@/components/ui';
import CheckInsContent from '@/screens/check-ins/CheckInsContent';
import CheckInsSkeleton from '@/screens/check-ins/CheckInsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function CheckInsScreen() {
  const { data, isPending, error, refetch, isRefetching } = useCheckInsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <CheckInsSkeleton />
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
      <CheckInsContent checkIns={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
