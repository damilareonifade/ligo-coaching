import { useCallback } from 'react';

import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import NewGroupContent from '@/screens/new-group/NewGroupContent';
import NewGroupSkeleton from '@/screens/new-group/NewGroupSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the header owns the top inset, so no safe-area edges here.
 *
 * The roster is the fetch, because the roster is the list of people a coach is
 * allowed to ask. There is no directory behind this screen and no search for
 * clients who are not already attached to them.
 */
export default function NewGroupScreen() {
  const { data, isPending, error, refetch } = useRosterQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <NewGroupSkeleton />
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
      <NewGroupContent clients={data.clients} />
    </LISafeArea>
  );
}
