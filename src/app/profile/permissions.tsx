import { useCallback } from 'react';

import { useSharePermissionsQuery } from '@/api/clientProfile';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import { LIEmptyState, LIErrorState, LISafeArea } from '@/components/ui';
import PermissionsContent from '@/screens/profile-permissions/PermissionsContent';
import PermissionsSkeleton from '@/screens/profile-permissions/PermissionsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Profile → COACH → Permissions.
 *
 * The row that opens this used to open `/onboarding/coach-permissions`, which
 * reads an onboarding draft and redirects anyone without a coach lookup in
 * progress — so an already-attached client tapping "Permissions" was sent to
 * the *find a coach* screen, and its button attached rather than updated.
 * This reads the live link.
 */
export default function PermissionsScreen() {
  const { data, isPending, error, refetch } = useSharePermissionsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <LISafeArea>
      <ScreenHeader title="Permissions" eyebrow="What your coach sees" backLabel="Profile" />

      {isPending ? <PermissionsSkeleton /> : null}

      {!isPending && (error || !data) ? (
        <LIErrorState message={error?.message} onRetry={refresh} />
      ) : null}

      {/* Reachable without a coach through a deep link or a stale back stack.
          There is nobody for the switches to be about, so they are not shown
          set to false — that would read as "hidden from Sam" with no Sam. */}
      {!isPending && data && data.coachName === null ? (
        <LIEmptyState
          title="No coach attached"
          message="Permissions describe what a coach can see. Attach one and they appear here."
        />
      ) : null}

      {!isPending && data && data.coachName !== null ? (
        <PermissionsContent detail={data} />
      ) : null}
    </LISafeArea>
  );
}
