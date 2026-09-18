import { useCallback } from 'react';

import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import NewGroupContent from '@/screens/new-group/NewGroupContent';
import NewGroupSkeleton from '@/screens/new-group/NewGroupSkeleton';
import { useAuthStore } from '@/store/authStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the header owns the top inset, so no safe-area edges here.
 *
 * The roster is the fetch, because the roster is the list of people a coach is
 * allowed to ask. There is no directory behind this screen and no search for
 * clients who are not already attached to them.
 *
 * A client has no roster, so there is nothing here for them to fetch and the
 * query is turned off rather than sent to prove it empty. That is not a
 * degraded version of the coach's screen: `invite_to_group` only accepts users
 * the caller is `is_linked_to`, which for a client is their coach and nobody
 * else — so a client's group fills by its join code, and the invite step is
 * not a step they have.
 */
export default function NewGroupScreen() {
  // Not `role === 'client'`, for the reason the tab bar gives: an unknown role
  // must not be handed the coach's seat, and the client's is the one with
  // nobody else's roster in it.
  const isClient = useAuthStore((state) => state.user?.role) !== 'coach';
  const { data, isPending, error, refetch } = useRosterQuery({ enabled: !isClient });

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!isClient && isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="New group"
          eyebrow="Community"
          backLabel="Community"
        />
        <NewGroupSkeleton />
      </LISafeArea>
    );
  }

  if (!isClient && (error || !data)) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="New group"
          eyebrow="Community"
          backLabel="Community"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="New group"
        eyebrow="Community"
        backLabel="Community"
      />
      <NewGroupContent clients={data?.clients ?? []} isClient={isClient} />
    </LISafeArea>
  );
}
