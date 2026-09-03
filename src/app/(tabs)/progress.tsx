import { useCallback } from 'react';

import { useClientProgressQuery } from '@/api/clientProgress';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ProgressContent from '@/screens/progress/ProgressContent';
import ProgressSkeleton from '@/screens/progress/ProgressSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function ProgressScreen() {
  const { data, isPending, error, refetch, isRefetching } = useClientProgressQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ProgressSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ProgressContent progress={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
