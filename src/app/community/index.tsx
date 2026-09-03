import { useCallback } from 'react';

import { useCommunityQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import CommunityContent from '@/screens/community/CommunityContent';
import CommunitySkeleton from '@/screens/community/CommunitySkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function CommunityScreen() {
  const { data, isPending, error, refetch, isRefetching } = useCommunityQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <CommunitySkeleton />
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
      <CommunityContent community={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
