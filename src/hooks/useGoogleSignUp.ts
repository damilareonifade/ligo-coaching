import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { errorMessage } from '@/api/client';
import { useGoogleSignInMutation } from '@/api/googleAuth';
import type { UserRole } from '@/api/types';
import { existingAccountMessage } from '@/lib/authMessages';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';

export interface GoogleSignUpFlow {
  readonly start: (role: UserRole) => Promise<void>;
  readonly pending: boolean;
}

/**
 * "Create your account with Google", shared by the role screen and the
 * details screen.
 *
 * Both entry points behave identically and differ only in where the button
 * sits, so the routing and the wording live here rather than in two copies
 * that drift. The login screen keeps its own handler: it has no role to pass
 * and sends new accounts to the role picker instead.
 */
export function useGoogleSignUp(): GoogleSignUpFlow {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const setDetails = useOnboardingStore((state) => state.setDetails);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useGoogleSignInMutation();

  const start = useCallback(
    async (role: UserRole) => {
      try {
        const result = await mutateAsync(role);
        // Dismissed the browser — a choice, not a failure.
        if (!result) return;

        // Never ask for what Google already told us: these prefill the
        // coach-profile and coach-code steps.
        setDetails({ name: result.profile.name, email: result.profile.email });
        await signIn(result.session, result.profile);

        if (result.roleWasUnconfirmed) {
          router.replace(
            result.profile.role === 'coach' ? '/onboarding/coach-profile' : '/onboarding/welcome',
          );
          return;
        }

        // The account already existed and had chosen its side. Say so, and
        // put them in the app rather than back through onboarding.
        showToast(existingAccountMessage(result.profile.role, role), 'info');
        router.replace('/');
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, router, setDetails, showToast, signIn],
  );

  return { start, pending: isPending };
}
