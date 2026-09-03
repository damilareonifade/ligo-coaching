import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useDetachCoachMutation } from '@/api/clientProfile';
import type { ApiClientCoachSummary, ApiSettingsRow } from '@/api/types';
import { LIAvatar, LIBadge, LIButton, LICard, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

import DetachCoachSheet from './DetachCoachSheet';
import ProfileRow from './ProfileRow';
import { useRowAction } from './useRowAction';

interface ProfileCoachSectionProps {
  readonly coach: ApiClientCoachSummary | null;
  readonly rows: readonly ApiSettingsRow[];
}

/** The one row that ends the relationship rather than opening a screen. */
const DETACH_ROW_ID = 'detach';

/**
 * Training alone is the default, not a failure state — with no coach the
 * section collapses to an invitation, and the permission rows go with it,
 * because there is nothing yet to grant.
 *
 * Detaching is handled here rather than through `useRowAction` because it is
 * the one coach row that is not navigation. Everything else on this card opens
 * a screen; this one opens a sheet and then ends an attachment, so it keeps
 * the mutation next to the section whose data it clears.
 */
export default function ProfileCoachSection({ coach, rows }: ProfileCoachSectionProps) {
  const router = useRouter();
  const handleRow = useRowAction();
  const showToast = useUiStore((state) => state.showToast);
  const [detaching, setDetaching] = useState(false);
  const detach = useDetachCoachMutation();

  const openCoach = useCallback(() => router.push('/coach/chat'), [router]);
  const addCoach = useCallback(() => router.push('/onboarding/attach-coach?direct=1'), [router]);

  const pressRow = useCallback(
    (row: ApiSettingsRow) => {
      if (row.id === DETACH_ROW_ID) {
        setDetaching(true);
        return;
      }
      handleRow(row);
    },
    [handleRow],
  );

  const confirmDetach = useCallback(() => {
    detach.mutate(undefined, {
      onSuccess: () => {
        setDetaching(false);
        showToast('Detached. Your data is untouched.', 'success');
      },
      onError: (error) => showToast(errorMessage(error), 'danger'),
    });
  }, [detach, showToast]);

  const closeDetach = useCallback(() => setDetaching(false), []);

  return (
    <View className="gap-2">
      <LIText size="caption" color="muted" text="COACH" className="px-1 font-geist-medium" />

      {coach ? (
        <LICard className="py-1">
          <Pressable
            onPress={openCoach}
            accessibilityRole="button"
            accessibilityLabel={`Message ${coach.line1}`}
            className="flex-row items-center gap-3 py-3 active:opacity-70"
            testID="profile-coach-row"
          >
            <LIAvatar name={coach.name} size="md" labelClassName="font-geist-semibold" />
            <View className="flex-1 gap-0.5">
              <LIText size="p" color="primary" text={coach.line1} className="font-geist-semibold" />
              <LIText size="caption" color="muted" text={coach.line2} className="font-geist" />
            </View>
            <LIBadge
              tone="violet"
              label={coach.permissionLabel}
              labelClassName="font-geist-medium"
            />
          </Pressable>

          {rows.map((row) => (
            <ProfileRow key={row.id} row={row} divided onPress={() => pressRow(row)} />
          ))}
        </LICard>
      ) : (
        <LICard className="gap-3">
          <LIText size="caption" color="muted" text="No coach attached" className="font-geist" />
          <LIButton
            title="Add a coach"
            variant="outline"
            fullWidth
            onPress={addCoach}
            testID="profile-add-coach"
          />
        </LICard>
      )}

      {coach ? (
        <DetachCoachSheet
          visible={detaching}
          coachName={coach.name}
          onClose={closeDetach}
          onConfirm={confirmDetach}
          loading={detach.isPending}
        />
      ) : null}
    </View>
  );
}
