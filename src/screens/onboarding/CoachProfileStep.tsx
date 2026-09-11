import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { LIButton, LIChip, LIInput, LIText } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboardingStore';

import { OnboardingBackButton } from './OnboardingBackButton';

const SPECIALTY_OPTIONS = ['Strength', 'Hypertrophy', 'Weight loss', 'Mobility'] as const;

export default function CoachProfileStep() {
  const router = useRouter();
  const name = useOnboardingStore((state) => state.name);
  const email = useOnboardingStore((state) => state.email);
  const setDetails = useOnboardingStore((state) => state.setDetails);
  const coachGym = useOnboardingStore((state) => state.coachGym);
  const coachBio = useOnboardingStore((state) => state.coachBio);
  const setCoachProfile = useOnboardingStore((state) => state.setCoachProfile);
  const specialties = useOnboardingStore((state) => state.specialties);
  const toggleSpecialty = useOnboardingStore((state) => state.toggleSpecialty);

  return (
    <View className="flex-1 gap-6 px-6 pt-2">
      <OnboardingBackButton onPress={() => router.back()} />

      <View className="gap-2">
        <LIText
          size="caption"
          color="accent"
          text="Coach setup · 1 of 2"
          className="font-semibold font-geist-medium text-violet"
        />
        <LIText
          size="h1"
          color="primary"
          text="Your coaching profile"
          className="font-geist-semibold text-ink"
        />
        <LIText
          size="p"
          color="body"
          text="Clients see this before they attach."
          className="font-geist"
        />
      </View>

      <View className="gap-4">
        <LIInput
          label="Display name"
          labelClassName="text-ink"
          value={name}
          onChangeText={(text) => setDetails({ name: text, email })}
          autoCapitalize="words"
          testID="coach-display-name"
        />
        <LIInput
          label="Gym or studio"
          labelClassName="text-ink"
          value={coachGym}
          onChangeText={(text) => setCoachProfile({ bio: coachBio, gym: text })}
          placeholder="Ironworks Lagos"
          autoCapitalize="words"
          testID="coach-gym"
        />
        <LIInput
          label="Short bio"
          labelClassName="text-ink"
          value={coachBio}
          onChangeText={(text) => setCoachProfile({ bio: text, gym: coachGym })}
          placeholder="A line or two about your coaching style"
          multiline
          numberOfLines={3}
          testID="coach-bio"
        />
      </View>

      <View className="gap-2">
        <LIText
          size="h5"
          color="primary"
          text="Specialties"
          className="font-geist-medium text-ink"
        />
        <View className="flex-row flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map((specialty) => (
            <LIChip
              key={specialty}
              label={specialty}
              selected={specialties.includes(specialty)}
              onPress={() => toggleSpecialty(specialty)}
              testID={`specialty-${specialty}`}
            />
          ))}
        </View>
      </View>

      <View className="mt-auto pb-4">
        <LIButton
          title="Continue"
          onPress={() => router.push('/onboarding/coach-code')}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="coach-profile-continue"
        />
      </View>
    </View>
  );
}
