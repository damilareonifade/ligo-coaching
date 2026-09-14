import { useCallback } from 'react';

import { useClientHealthQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import HealthContent from '@/screens/profile-health/HealthContent';
import HealthSkeleton from '@/screens/profile-health/HealthSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function HealthScreen() {
  const { data, isPending, error, refetch } = useClientHealthQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Health profile"
          eyebrow="About you"
          backLabel="Profile"
        />
        <HealthSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Health profile"
          eyebrow="About you"
          backLabel="Profile"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Health profile"
        eyebrow="About you"
        backLabel="Profile"
      />
      <HealthContent health={data} />
    </LISafeArea>
  );
}
