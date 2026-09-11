import { useCallback } from 'react';

import { useClientHealthQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import HealthContent from '@/screens/profile-health/HealthContent';
import HealthSkeleton from '@/screens/profile-health/HealthSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function HealthScreen() {
  const { data, isPending, error, refetch } = useClientHealthQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <HealthSkeleton />
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
      <HealthContent health={data} />
    </LISafeArea>
  );
}
