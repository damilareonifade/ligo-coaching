import { useCallback } from 'react';

import { useClientDataQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import DataContent from '@/screens/profile-data/DataContent';
import DataSkeleton from '@/screens/profile-data/DataSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function DataScreen() {
  const { data, isPending, error, refetch } = useClientDataQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Data & privacy"
          eyebrow="Your data"
          backLabel="Profile"
        />
        <DataSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Data & privacy"
          eyebrow="Your data"
          backLabel="Profile"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Data & privacy"
        eyebrow="Your data"
        backLabel="Profile"
      />
      <DataContent data={data} />
    </LISafeArea>
  );
}
