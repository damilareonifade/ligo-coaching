import { useCallback } from 'react';

import { useDeviceSessionsQuery, useRevokeDeviceSessionMutation } from '@/api/appSessions';
import { useCoachProfileQuery, useInviteCodeQuery } from '@/api/coachProfile';
import { LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import CoachSettingsContent from '@/screens/coach-settings/CoachSettingsContent';
import CoachSettingsFallback from '@/screens/coach-settings/CoachSettingsFallback';
import CoachSettingsSkeleton from '@/screens/coach-settings/CoachSettingsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * The coach's settings. Coach-only by routing: `(tabs)/_layout.tsx` gives this
 * tab `href: null` for a client, who has their own Profile tab instead. The
 * two are not the same screen with different rows — a client's account is
 * about what they share, a coach's is about how they work — so neither role
 * sees the other's, and nothing here has a client branch.
 */
export default function CoachSettingsScreen() {
  const { data, isPending, error, refetch, isRefetching } = useCoachProfileQuery();
  // Its own query, not a field on the profile: three screens show this code
  // and it has one source, so none of them can drift from the others.
  const { data: inviteCode } = useInviteCodeQuery();
  // The device list comes from public.sessions, so it is fetched here beside
  // the profile rather than inside the card that renders it.
  const devices = useDeviceSessionsQuery();
  const revoke = useRevokeDeviceSessionMutation();

  const refresh = useCallback(() => {
    void refetch();
    void devices.refetch();
  }, [devices, refetch]);

  const handleRevoke = useCallback(
    (sessionId: string) => {
      revoke.mutate(sessionId, { onSuccess: () => void devices.refetch() });
    },
    [devices, revoke],
  );

  return (
    <LISafeArea>
      <ScreenHeader title="Settings" eyebrow="Your account" />
      {isPending ? <CoachSettingsSkeleton /> : null}

      {/* Sign out lives in here as well as in the list below — the list is in
          the success branch, and a coach who cannot load this screen is
          exactly the coach who needs to get out of the account. */}
      {!isPending && (error || !data) ? (
        <CoachSettingsFallback message={error?.message} onRetry={refresh} />
      ) : null}

      {!isPending && data ? (
        <CoachSettingsContent
          profile={data}
          inviteCode={inviteCode}
          devices={devices.data ?? []}
          onRevokeDevice={handleRevoke}
          revokingDeviceId={revoke.isPending ? (revoke.variables ?? null) : null}
          refreshing={isRefetching}
          onRefresh={refresh}
        />
      ) : null}
    </LISafeArea>
  );
}
