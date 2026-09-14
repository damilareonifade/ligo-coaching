import { useCallback } from 'react';

import { useAccessRequestsQuery, useClientProfileQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import ProfileContent from '@/screens/profile/ProfileContent';
import ProfileSkeleton from '@/screens/profile/ProfileSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function ProfileScreen() {
  const { data, isPending, error, refetch, isRefetching } = useClientProfileQuery();
  // A separate query rather than a field on the profile: a request is
  // addressed to this person and waiting on them, and answering one must
  // refetch the questions without re-reading the whole profile behind them.
  const requests = useAccessRequestsQuery();

  const refresh = useCallback(() => {
    void refetch();
    void requests.refetch();
  }, [refetch, requests]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader title="Profile" eyebrow="Your account" />
        <ProfileSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader title="Profile" eyebrow="Your account" />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader title="Profile" eyebrow="Your account" />
      <ProfileContent
        profile={data}
        accessRequests={requests.data ?? []}
        refreshing={isRefetching}
        onRefresh={refresh}
      />
    </LISafeArea>
  );
}
