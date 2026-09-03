import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { LIButton, LIChip, LISegmented, LIText } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';

import { OnboardingBackButton } from './OnboardingBackButton';

const GOAL_OPTIONS = ['Strength', 'Muscle', 'Fat loss', 'Endurance', 'Mobility'] as const;

const EXPERIENCE_OPTIONS = [
  { label: 'New to training', value: 'New to training' },
  { label: '1–3 yrs', value: '1–3 yrs' },
  { label: '3+ yrs', value: '3+ yrs' },
] as const;

export default function GoalsStep() {
  const router = useRouter();
  const goals = useOnboardingStore((state) => state.goals);
  const toggleGoal = useOnboardingStore((state) => state.toggleGoal);
  const experience = useOnboardingStore((state) => state.experience);
  const setExperience = useOnboardingStore((state) => state.setExperience);

  const goToTargets = () => router.push('/onboarding/targets');

  return (
    <View className="flex-1 gap-6 px-6 pt-2">
      <OnboardingBackButton onPress={() => router.back()} />

      <View className="gap-2">
        <LIText
          size="caption"
          color="accent"
          text="Step 1 of 3"
          className="font-semibold font-geist-medium text-violet"
        />
        <LIText
          size="h1"
          color="primary"
          text="What are you training for?"
          className="font-geist-semibold text-ink"
        />
        <LIText
          size="p"
          color="body"
          text="Pick any. This shapes your defaults, nothing is locked in."
          className="font-geist"
        />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {GOAL_OPTIONS.map((goal) => (
          <LIChip
            key={goal}
            label={goal}
            selected={goals.includes(goal)}
            onPress={() => toggleGoal(goal)}
            testID={`goal-${goal}`}
          />
        ))}
      </View>

      <View className="gap-2">
        <LIText
          size="h5"
          color="primary"
          text="Training experience"
          className="font-geist-medium text-ink"
        />
        <LISegmented options={EXPERIENCE_OPTIONS} value={experience} onChange={setExperience} />
      </View>

      <View className="mt-auto gap-3 pb-4">
        <LIButton
          title="Continue"
          onPress={goToTargets}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="goals-continue"
        />
        <LIButton
          title="Skip"
          onPress={goToTargets}
          variant="ghost"
          fullWidth
          size="lg"
          shape="rounded"
          labelClassName="text-violet"
        />
      </View>
    </View>
  );
}
