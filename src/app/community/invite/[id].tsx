import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { useClientProfileQuery } from '@/api/clientProfile';
import { useCommunityQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import InviteContent from '@/screens/community-invite/InviteContent';
import InviteSkeleton from '@/screens/community-invite/InviteSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the header owns the top inset, so no safe-area edges here.
 *
 * Invitations arrive with the index rather than from an endpoint of their own:
 * there is one list of pending invitations and this screen reads one row of
 * it, so opening an invitation from the index costs nothing.
 *
 * The profile is the second fetch, for one field, and for the reason the board
 * opt-in gives in the same words: the "Real name" option promises the name on
 * the profile, and the only way to keep that honest is to show them that exact
 * name rather than a guess assembled from the session.
 */
export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useCommunityQuery();
  const profile = useClientProfileQuery();

  // Answering removes the invitation from the list this screen reads. Without
  // this the moment between the write landing and the navigation completing
  // renders "no longer open" over a decision that was just made correctly.
  const [answered, setAnswered] = useState(false);
  const markAnswered = useCallback(() => setAnswered(true), []);

  const refresh = useCallback(() => {
    void refetch();
    void profile.refetch();
  }, [profile, refetch]);

  if (isPending || profile.isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Invitation"
          eyebrow="Community"
          backLabel="Community"
        />
        <InviteSkeleton />
      </LISafeArea>
    );
  }

  const failed = error ?? profile.error;

  if (failed || !data || !profile.data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Invitation"
          eyebrow="Community"
          backLabel="Community"
        />
        <LIErrorState message={failed?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  const invite = data.invites.find((candidate) => candidate.id === id);

  if (!invite) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Invitation"
          eyebrow="Community"
          backLabel="Community"
        />
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
    <LISafeArea>
      <ScreenHeader
        title="Invitation"
        eyebrow="Community"
        backLabel="Community"
      />
      <InviteContent invite={invite} realName={profile.data.name} onAnswered={markAnswered} />
    </LISafeArea>
  );
}
