import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { LIButton, LICard, LIChip, LISegmented, LIText } from '@/components/ui';
import { UNIT_CHOICES } from '@/lib/onboarding';
import { useOnboardingStore } from '@/store/onboardingStore';

import { OnboardingBackButton } from './OnboardingBackButton';

const UNIT_OPTIONS = UNIT_CHOICES.map((choice) => ({ label: choice, value: choice }));

const SESSION_OPTIONS = [2, 3, 4, 5, 6] as const;

const SUGGESTED_TARGETS = [
  { value: '2,400', label: 'Kcal / day' },
  { value: '180g', label: 'Protein' },
  { value: '8,000', label: 'Steps' },
] as const;

export default function TargetsStep() {
  const router = useRouter();
  const units = useOnboardingStore((state) => state.units);
  const setUnits = useOnboardingStore((state) => state.setUnits);
  const sessionsPerWeek = useOnboardingStore((state) => state.sessionsPerWeek);
  const setSessionsPerWeek = useOnboardingStore((state) => state.setSessionsPerWeek);

  return (
    <View className="flex-1 gap-6 px-6 pt-2">
      <OnboardingBackButton onPress={() => router.back()} />

      <View className="gap-2">
        <LIText
          size="caption"
          color="accent"
          text="Step 2 of 3"
          className="font-semibold font-geist-medium text-violet"
        />
        <LIText
          size="h1"
          color="primary"
          text="Set your baseline"
          className="font-geist-semibold text-foreground"
        />
        <LIText
          size="p"
          color="body"
          text="Editable any time from your profile."
          className="font-geist"
        />
      </View>

      <View className="gap-2">
        <LIText size="h5" color="primary" text="Units" className="font-geist-medium text-foreground" />
        <LISegmented options={UNIT_OPTIONS} value={units} onChange={setUnits} />
      </View>

      <View className="gap-2">
        <LIText
          size="h5"
          color="primary"
          text="Sessions per week"
          className="font-geist-medium text-foreground"
        />
        <View className="flex-row gap-2">
          {SESSION_OPTIONS.map((count) => (
            <LIChip
              key={count}
              label={String(count)}
              selected={sessionsPerWeek === count}
              onPress={() => setSessionsPerWeek(count)}
              testID={`sessions-${count}`}
            />
          ))}
        </View>
      </View>

      <LICard className="gap-3 bg-surface">
        <LIText
          size="h5"
          color="primary"
          text="Suggested targets"
          className="font-geist-medium text-foreground"
        />
        <View className="flex-row gap-3">
          {SUGGESTED_TARGETS.map((target) => (
            <View key={target.label} className="flex-1 items-center gap-1 rounded-card bg-surface p-3">
              <LIText
                size="h3"
                color="primary"
                text={target.value}
                className="font-geist-medium text-foreground"
              />
              <LIText
                size="caption"
                color="muted"
                text={target.label}
                numberOfLines={1}
                className="font-geist"
              />
            </View>
          ))}
        </View>
        <LIText
          size="caption"
          color="muted"
          text="Based on your goals and experience. Fully editable."
          className="font-geist"
        />
      </LICard>

      <View className="mt-auto pb-4">
        <LIButton
          title="Continue"
          onPress={() => router.push('/onboarding/attach-coach')}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="targets-continue"
        />
      </View>
    </View>
  );
}
