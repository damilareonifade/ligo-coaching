import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { useLookupCoachMutation } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { LIButton, LICard, LIInput, LIText } from '@/components/ui';
import { useFinishOnboarding } from '@/hooks/useFinishOnboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';

import { OnboardingBackButton } from './OnboardingBackButton';

export default function AttachCoachStep() {
  const router = useRouter();
  const { direct } = useLocalSearchParams<{ direct?: string }>();
  const isDirect = direct === '1' || direct === 'true';

  const inviteCode = useOnboardingStore((state) => state.inviteCode);
  const setInviteCode = useOnboardingStore((state) => state.setInviteCode);
  const setLookedUpCoach = useOnboardingStore((state) => state.setLookedUpCoach);
  const finishOnboarding = useFinishOnboarding();
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useLookupCoachMutation();

  const handleContinue = useCallback(async () => {
    try {
      const coach = await mutateAsync(inviteCode);
      setLookedUpCoach(coach);
      router.push('/onboarding/coach-permissions');
    } catch (error) {
      showToast(errorMessage(error), 'danger');
    }
  }, [inviteCode, mutateAsync, router, setLookedUpCoach, showToast]);

  const handleNotNow = useCallback(() => {
    if (isDirect) {
      router.back();
      return;
    }
    finishOnboarding();
    router.replace('/');
  }, [finishOnboarding, isDirect, router]);

  return (
    <View className="flex-1 gap-6 px-6 pt-2">
      <OnboardingBackButton onPress={() => router.back()} />

      <View className="gap-2">
        {!isDirect ? (
          <LIText
            size="caption"
            color="accent"
            text="Step 3 of 3"
            className="font-semibold font-geist-medium text-violet"
          />
        ) : null}
        <LIText
          size="h1"
          color="primary"
          text="Working with a coach?"
          className="font-geist-semibold text-ink"
        />
        <LIText
          size="p"
          color="body"
          text="Optional, and reversible. Everything in Ligo works without one."
          className="font-geist"
        />
      </View>

      <LICard className="gap-3 bg-white">
        <LIText
          size="h5"
          color="primary"
          text="Invite code"
          className="font-geist-medium text-ink"
        />
        <LIInput
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          placeholder="SAM-4KQ2"
          autoCapitalize="characters"
          autoCorrect={false}
          testID="invite-code-input"
        />
        <LIButton
          title="Continue"
          onPress={() => void handleContinue()}
          loading={isPending}
          fullWidth
          className="bg-violet active:bg-violet/90"
          testID="lookup-coach"
        />
        <LIText
          size="caption"
          color="muted"
          text="Next you choose exactly what this coach can see. Nothing is shared before you do."
          className="font-geist"
        />
      </LICard>

      <View className="mt-auto gap-3 pb-4">
        <LIButton
          title="Not right now"
          onPress={handleNotNow}
          variant="ghost"
          fullWidth
          size="lg"
          shape="rounded"
          labelClassName="text-violet"
          testID="attach-coach-not-now"
        />
        <LIText
          size="caption"
          color="muted"
          text="You can attach or detach a coach at any point, from your profile."
          className="text-center font-geist"
        />
      </View>
    </View>
  );
}
