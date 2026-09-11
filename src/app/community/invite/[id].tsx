import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { useCommunityQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import InviteContent from '@/screens/community-invite/InviteContent';
import InviteSkeleton from '@/screens/community-invite/InviteSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the header owns the top inset, so no safe-area edges here.
 *
 * Invitations arrive with the index rather than from an endpoint of their own:
 * there is one list of pending invitations and this screen reads one row of
 * it, so opening an invitation from the index costs nothing.
 */
export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useCommunityQuery();

  // Answering removes the invitation from the list this screen reads. Without
  // this the moment between the write landing and the navigation completing
  // renders "no longer open" over a decision that was just made correctly.
  const [answered, setAnswered] = useState(false);
  const markAnswered = useCallback(() => setAnswered(true), []);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <InviteSkeleton />
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

  const invite = data.invites.find((candidate) => candidate.id === id);

  if (!invite) {
    return (
      <LISafeArea edges={[]}>
        {answered ? null : (
          <LIErrorState
            message="This invitation is no longer open. Your coach can send another one."
            onRetry={refresh}
          />
        )}
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={[]}>
      <InviteContent invite={invite} onAnswered={markAnswered} />
    </LISafeArea>
  );
}
