import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useSaveCoachProfileMutation } from '@/api/coachProfile';
import type { ApiCoachProfileForm } from '@/api/types';
import { LIButton, LIChip, LIInput, LIText } from '@/components/ui';
import { COACH_SPECIALTIES } from '@/lib/coachSettings';
import { useUiStore } from '@/store/uiStore';

interface CoachProfileFormProps {
  readonly initial: ApiCoachProfileForm;
}

/**
 * The coach's public face, after onboarding.
 *
 * The same three fields `CoachProfileStep` collects, because they are the same
 * three fields — a coach who changes gym a year in is doing what onboarding
 * did, not something new. What differs is that onboarding writes to a Zustand
 * draft and this writes straight through: there is no later step to save on
 * behalf of, so Save is a button here and not a consequence of Continue.
 *
 * Local state seeded from the query rather than bound to it. A form that
 * re-reads the cache while it is being typed in loses what is half-written the
 * moment anything else invalidates the key.
 */
export default function CoachProfileForm({ initial }: CoachProfileFormProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const save = useSaveCoachProfileMutation();

  const [name, setName] = useState(initial.name);
  const [gym, setGym] = useState(initial.gym);
  const [bio, setBio] = useState(initial.bio);
  const [specialties, setSpecialties] = useState<readonly string[]>(initial.specialties);

  const toggleSpecialty = useCallback((specialty: string) => {
    setSpecialties((current) =>
      current.includes(specialty)
        ? current.filter((entry) => entry !== specialty)
        : [...current, specialty],
    );
  }, []);

  const handleSave = useCallback(() => {
    save.mutate(
      { name, gym, bio, specialties },
      {
        onSuccess: () => {
          showToast('Profile saved', 'success');
          if (router.canGoBack()) router.back();
        },
        onError: (error) => showToast(errorMessage(error), 'danger'),
      },
    );
  }, [bio, gym, name, router, save, showToast, specialties]);

  return (
    <View className="flex-1 gap-6 px-4 pb-8 pt-2">
      <LIText
        size="p"
        color="body"
        text="This is what a client reads before they attach with your code."
        className="font-geist"
      />

      <View className="gap-4">
        <LIInput
          label="Display name"
          labelClassName="text-ink"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          testID="coach-profile-name"
        />
        <LIInput
          label="Gym or studio"
          labelClassName="text-ink"
          value={gym}
          onChangeText={setGym}
          placeholder="Ironworks Lagos"
          autoCapitalize="words"
          testID="coach-profile-gym"
        />
        <LIInput
          label="Short bio"
          labelClassName="text-ink"
          value={bio}
          onChangeText={setBio}
          placeholder="A line or two about your coaching style"
          multiline
          numberOfLines={3}
          testID="coach-profile-bio"
        />
      </View>

      <View className="gap-2">
        <LIText
          size="h5"
          color="primary"
          text="Specialties"
          className="font-geist-medium text-ink"
        />
        <LIText
          size="caption"
          color="muted"
          text="The first one leads your profile line."
          className="font-geist"
        />
        <View className="flex-row flex-wrap gap-2">
          {COACH_SPECIALTIES.map((specialty) => (
            <LIChip
              key={specialty}
              label={specialty}
              selected={specialties.includes(specialty)}
              onPress={() => toggleSpecialty(specialty)}
              testID={`coach-profile-specialty-${specialty}`}
            />
          ))}
        </View>
      </View>

      <View className="mt-auto">
        <LIButton
          title={save.isPending ? 'Saving…' : 'Save'}
          onPress={handleSave}
          disabled={save.isPending || name.trim().length === 0}
          fullWidth
          size="lg"
          shape="rounded"
          testID="coach-profile-save"
        />
      </View>
    </View>
  );
}
