import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useClientProfileQuery } from '@/api/clientProfile';
import { useBoardQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import OptInContent from '@/screens/board-optin/OptInContent';
import OptInSkeleton from '@/screens/board-optin/OptInSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the header owns the top inset, so no safe-area edges here.
 *
 * Two fetches, both at screen level. The profile is here for one field: the
 * "Real name" option promises the name on the client's profile, and the only
 * way to keep that promise honest is to show them that exact name rather than
 * a guess assembled from the session.
 */
export default function BoardOptInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const board = useBoardQuery(id);
  const profile = useClientProfileQuery();

  const refresh = useCallback(() => {
    void board.refetch();
    void profile.refetch();
  }, [board, profile]);

  if (board.isPending || profile.isPending) {
    return (
      <LISafeArea edges={[]}>
        <OptInSkeleton />
      </LISafeArea>
    );
  }

  const error = board.error ?? profile.error;

  if (error || !board.data || !profile.data) {
    return (
      <LISafeArea edges={[]}>
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={[]}>
      <OptInContent board={board.data} realName={profile.data.name} />
    </LISafeArea>
  );
}
