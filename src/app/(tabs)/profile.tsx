import { useCallback } from 'react';

import { useClientProfileQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ProfileContent from '@/screens/profile/ProfileContent';
import ProfileSkeleton from '@/screens/profile/ProfileSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function ProfileScreen() {
  const { data, isPending, error, refetch, isRefetching } = useClientProfileQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ProfileSkeleton />
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
      <ProfileContent profile={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
