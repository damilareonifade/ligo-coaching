import { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useRegenerateInviteCodeMutation,
  useToggleCoachNotificationMutation,
} from '@/api/coachProfile';
import type { ApiCoachProfile, ApiDeviceSession } from '@/api/types';
import { LIText } from '@/components/ui';
import { useInviteCodeActions } from '@/hooks/useInviteCodeActions';
import { COACH_EXPORT_NOTE } from '@/lib/coachProfile';
import { hasFeature } from '@/lib/features';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

import CoachHeroCard from './CoachHeroCard';
import CoachNotificationsCard from './CoachNotificationsCard';
import CoachSettingsGroups from './CoachSettingsGroups';
import DeviceSessionsCard from './DeviceSessionsCard';

interface CoachSettingsContentProps {
  readonly profile: ApiCoachProfile;
  /** `undefined` while it loads — the hero card shows a skeleton for it. */
  readonly inviteCode: string | undefined;
  readonly devices: readonly ApiDeviceSession[];
  readonly onRevokeDevice: (sessionId: string) => void;
  readonly revokingDeviceId: string | null;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function CoachSettingsContent({
  profile,
  inviteCode,
  devices,
  onRevokeDevice,
  revokingDeviceId,
  refreshing,
  onRefresh,
}: CoachSettingsContentProps) {
  const tokens = useThemeTokens();
  const showToast = useUiStore((state) => state.showToast);
  const signOut = useAuthStore((state) => state.signOut);
  const toggle = useToggleCoachNotificationMutation();
  const roll = useRegenerateInviteCodeMutation();

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      toggle.mutate(
        { id, enabled },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [showToast, toggle],
  );

  const { copy: handleCopy } = useInviteCodeActions(inviteCode);

  /**
   * Confirmed, because it cannot be undone and it breaks something that
   * already exists: every copy of the old code a coach has handed out stops
   * working the moment this returns. The alert says that rather than asking
   * "are you sure".
   */
  const handleRoll = useCallback(() => {
    Alert.alert(
      'Roll your invite code?',
      'The old code stops working straight away. Clients already attached stay attached — they just cannot be joined with it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Roll code',
          style: 'destructive',
          onPress: () =>
            roll.mutate(undefined, {
              onSuccess: () => showToast('New code issued', 'success'),
              onError: (error) => showToast(errorMessage(error), 'danger'),
            }),
        },
      ],
    );
  }, [roll, showToast]);

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
        inviteCode={inviteCode}
        onCopy={handleCopy}
        onRoll={handleRoll}
        rolling={roll.isPending}
      />

      {/* Hidden rather than deleted: the card and its refusal logic are built
          and tested, and nothing sends a notification yet — so a switch here
          would store a preference nothing acts on. See src/lib/features.ts. */}
      {hasFeature('notifications') ? (
        <CoachNotificationsCard rows={profile.notifications} onToggle={handleToggle} />
      ) : null}

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
