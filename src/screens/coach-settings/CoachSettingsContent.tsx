import { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import { useToggleCoachNotificationMutation } from '@/api/coachProfile';
import type { ApiCoachProfile, ApiDeviceSession } from '@/api/types';
import { LIText } from '@/components/ui';
import { COACH_EXPORT_NOTE } from '@/lib/coachProfile';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

import CoachHeroCard from './CoachHeroCard';
import CoachNotificationsCard from './CoachNotificationsCard';
import CoachSettingsGroups from './CoachSettingsGroups';
import DeviceSessionsCard from './DeviceSessionsCard';

interface CoachSettingsContentProps {
  readonly profile: ApiCoachProfile;
  readonly devices: readonly ApiDeviceSession[];
  readonly onRevokeDevice: (sessionId: string) => void;
  readonly revokingDeviceId: string | null;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function CoachSettingsContent({
  profile,
  devices,
  onRevokeDevice,
  revokingDeviceId,
  refreshing,
  onRefresh,
}: CoachSettingsContentProps) {
  const showToast = useUiStore((state) => state.showToast);
  const signOut = useAuthStore((state) => state.signOut);
  const toggle = useToggleCoachNotificationMutation();

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      toggle.mutate(
        { id, enabled },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [showToast, toggle],
  );

  // Stubbed: there is no clipboard module in the app yet, and adding a native
  // dependency for one row belongs in its own change. The toast is honest
  // about what happened — see the report note on stubs.
  const handleCopy = useCallback(() => {
    showToast('Copying is not wired up yet', 'info');
  }, [showToast]);

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-10 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
      testID="coach-settings-scroll"
    >
      <CoachHeroCard
        name={profile.name}
        headline={profile.headline}
        inviteCode={profile.inviteCode}
        onCopy={handleCopy}
      />

      <CoachNotificationsCard rows={profile.notifications} onToggle={handleToggle} />

      <DeviceSessionsCard
        sessions={devices}
        onRevoke={onRevokeDevice}
        revokingId={revokingDeviceId}
      />

      <CoachSettingsGroups
        groups={profile.groups}
        onSignOut={handleSignOut}
        onCopyInviteCode={handleCopy}
      />

      <LIText
        size="caption"
        color="muted"
        text={COACH_EXPORT_NOTE}
        className="px-1 pt-2 font-geist"
        testID="coach-export-note"
      />
    </ScrollView>
  );
}
