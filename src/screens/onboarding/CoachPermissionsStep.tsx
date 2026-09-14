import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';

import { useAttachCoachMutation } from '@/api/auth';
import { errorMessage } from '@/api/client';
import type { ShareDomain } from '@/api/types';
import { LIAvatar, LIButton, LICard, LISwitch, LIText } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';

import { OnboardingBackButton } from './OnboardingBackButton';

interface PermissionRowConfig {
  readonly key: ShareDomain;
  readonly title: string;
  readonly body: string;
}

/**
 * One row per shareable domain, and the list is exhaustive on purpose: the
 * coach's review screen can ask for any of these, and a question with no
 * switch here is one the client has no way to answer.
 */
const PERMISSION_ROWS: readonly PermissionRowConfig[] = [
  { key: 'workouts', title: 'Workouts', body: 'Programs, sets, and completed sessions.' },
  { key: 'nutrition', title: 'Nutrition', body: 'Meals and macros you log.' },
  { key: 'metrics', title: 'Metrics', body: 'Weight, measurements, and progress photos.' },
  {
    key: 'health',
    title: 'Health profile',
    body: 'Injuries, conditions and medication.',
  },
  {
    key: 'monthly',
    title: 'Monthly check-ins',
    body: 'Your check-in answers and the photos attached to them.',
  },
];

export default function CoachPermissionsStep() {
  const router = useRouter();
  const lookedUpCoach = useOnboardingStore((state) => state.lookedUpCoach);
  const permissions = useOnboardingStore((state) => state.permissions);
  const togglePermission = useOnboardingStore((state) => state.togglePermission);
  const logFor = useOnboardingStore((state) => state.logFor);
  const toggleLogFor = useOnboardingStore((state) => state.toggleLogFor);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useAttachCoachMutation();

  useEffect(() => {
    if (lookedUpCoach === null) {
      router.replace('/onboarding/attach-coach');
    }
  }, [lookedUpCoach, router]);

  const handleAttach = useCallback(async () => {
    if (lookedUpCoach === null) return;
    try {
      await mutateAsync({ coachId: lookedUpCoach.id, permissions, logFor });
      router.replace('/onboarding/attached');
    } catch (error) {
      showToast(errorMessage(error), 'danger');
    }
  }, [lookedUpCoach, logFor, mutateAsync, permissions, router, showToast]);

  if (lookedUpCoach === null) return null;

  const firstName = lookedUpCoach.name.split(' ')[0];
  const enabledLabels = PERMISSION_ROWS.filter((row) => permissions[row.key]).map(
    (row) => row.title,
  );
  const summaryText =
    enabledLabels.length > 0
      ? enabledLabels.join(', ')
      : 'Nothing yet — turn something on above.';

  return (
    <View className="flex-1 gap-6 px-6 pt-2">
      <OnboardingBackButton onPress={() => router.back()} />

      <LICard className="flex-row items-center gap-3 bg-white">
        <LIAvatar name={lookedUpCoach.name} className="bg-violet-weak" labelClassName="text-violet" />
        <View className="flex-1 gap-0.5">
          <LIText
            size="h5"
            color="primary"
            text={lookedUpCoach.name}
            className="font-geist-medium text-ink"
          />
          <LIText size="caption" color="muted" text={lookedUpCoach.headline} className="font-geist" />
        </View>
      </LICard>

      <View className="gap-2">
        <LIText
          size="h1"
          color="primary"
          text={`Choose what ${firstName} can see`}
          className="font-geist-semibold text-ink"
        />
        <LIText
          size="p"
          color="body"
          text="Everything is off until you turn it on. You can change any of this later, from this same screen."
          className="font-geist"
        />
      </View>

      <View className="gap-3">
        {PERMISSION_ROWS.map((row) => (
          <View key={row.key} className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <LIText
                size="h5"
                color="primary"
                text={row.title}
                className="font-geist-medium text-ink"
              />
              <LIText size="caption" color="muted" text={row.body} className="font-geist" />
            </View>
            <LISwitch
              value={permissions[row.key]}
              onValueChange={() => togglePermission(row.key)}
              testID={`permission-${row.key}`}
            />
          </View>
        ))}

        <View className="flex-row items-center justify-between gap-3 rounded-card bg-field p-3">
          <View className="flex-1 gap-0.5">
            <LIText
              size="h5"
              color="primary"
              text={`${firstName} can log for me`}
              className="font-geist-medium text-ink"
            />
            <LIText
              size="caption"
              color="muted"
              text={`Write access. Entries ${firstName} adds are labelled with their name in your history.`}
              className="font-geist"
            />
          </View>
          <LISwitch value={logFor} onValueChange={toggleLogFor} testID="permission-log-for" />
        </View>
      </View>

      <LICard className="gap-1 bg-white">
        <LIText
          size="h5"
          color="primary"
          text={`${firstName} will see`}
          className="font-geist-medium text-ink"
        />
        <LIText size="p" color="body" text={summaryText} className="font-geist" />
      </LICard>

      <View className="mt-auto gap-3 pb-4">
        <LIButton
          title="Attach coach"
          onPress={() => void handleAttach()}
          loading={isPending}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="attach-coach-confirm"
        />
        <LIButton
          title="Not now"
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
          size="lg"
          shape="rounded"
          labelClassName="text-violet"
          testID="attach-coach-not-now-2"
        />
      </View>
    </View>
  );
}
