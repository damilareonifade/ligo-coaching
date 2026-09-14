import { useCallback } from 'react';

import { useClientProgressQuery } from '@/api/clientProgress';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
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
        <ScreenHeader title="Progress" eyebrow="Your training" />
        <ProgressSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader title="Progress" eyebrow="Your training" />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader title="Progress" eyebrow="Your training" />
      <ProgressContent progress={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
