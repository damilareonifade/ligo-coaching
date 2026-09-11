import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useConfirmRoleMutation } from '@/api/users';
import type { UserRole } from '@/api/types';
import { LIButton, LIText } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Asked only of accounts created through Google, which arrive with an
 * identity but no role — Google has no field for "am I coaching or being
 * coached". Email signups pick a role first, so they never see this.
 *
 * The choice is final: the database refuses a change once confirmed.
 */
export default function ChooseRoleAfterSignIn() {
  const router = useRouter();
  const setNeedsRole = useAuthStore((state) => state.setNeedsRole);
  const user = useAuthStore((state) => state.user);
  const setRole = useOnboardingStore((state) => state.setRole);
  const setDetails = useOnboardingStore((state) => state.setDetails);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useConfirmRoleMutation();

  const choose = useCallback(
    (role: UserRole) => async () => {
      try {
        await mutateAsync({ role });
        setRole(role);
        // Only Google accounts reach this screen, so the identity already in
        // the store is Google's — carry it into the steps that ask for a name.
        if (user) setDetails({ name: user.name, email: user.email });
        setNeedsRole(false);
        router.replace(role === 'coach' ? '/onboarding/coach-profile' : '/onboarding/welcome');
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, router, setDetails, setNeedsRole, setRole, showToast, user],
  );

  return (
    <View className="flex-1 justify-center gap-8 px-6">
      <View className="gap-3">
        <LIText
          size="h1"
          color="primary"
          text="How will you use Ligo?"
          className="font-geist-semibold text-ink"
        />
        <LIText
          size="p"
          color="body"
          text="Your account is ready. One last thing — this decides which app you see, and it cannot be changed later."
          className="font-geist"
        />
      </View>

      <View className="gap-3">
        <LIButton
          title="I coach people"
          onPress={() => void choose('coach')()}
          disabled={isPending}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="choose-coach"
        />
        <LIButton
          title="I'm training"
          onPress={() => void choose('client')()}
          disabled={isPending}
          variant="social"
          fullWidth
          size="lg"
          shape="rounded"
          testID="choose-client"
        />
      </View>
    </View>
  );
}
