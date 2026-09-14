import { useCallback } from 'react';

import { useInviteCodeQuery } from '@/api/coachProfile';
import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import RosterContent from '@/screens/roster/RosterContent';
import RosterSkeleton from '@/screens/roster/RosterSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the queries are here, the filters are RosterContent's.
 *
 * The invite code is its own query rather than a field on the roster: three
 * screens show it and it has exactly one source, so none of them can drift
 * from the others the way they did when each made one up.
 */
export default function RosterScreen() {
  const { data, isPending, error, refetch, isRefetching } = useRosterQuery();
  const { data: inviteCode } = useInviteCodeQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader title="Roster" eyebrow="Your clients" />
        <RosterSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader title="Roster" eyebrow="Your clients" />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader title="Roster" eyebrow="Your clients" />
      <RosterContent
        roster={data}
        inviteCode={inviteCode}
        refreshing={isRefetching}
        onRefresh={refresh}
      />
    </LISafeArea>
  );
}
