import { useCallback } from 'react';

import { useClientDataQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import DataContent from '@/screens/profile-data/DataContent';
import DataSkeleton from '@/screens/profile-data/DataSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function DataScreen() {
  const { data, isPending, error, refetch } = useClientDataQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <DataSkeleton />
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
      <DataContent data={data} />
    </LISafeArea>
  );
}
