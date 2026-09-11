import { useCallback } from 'react';

import { markOnboarded } from '@/api/users';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * The one way out of onboarding.
 *
 * Three screens end the flow — a client attaching to a coach, a client
 * skipping that, and a coach finishing setup — and each has to do the same
 * three things: stamp `users.onboarded_at`, record it locally, and clear the
 * draft so a second signup on this device does not inherit the first one's
 * answers.
 *
 * The server stamp is fire-and-forget: someone who has finished onboarding
 * should not be held at the last screen because the write failed. Worst case
 * the column stays null and they see the flow again on a fresh install.
 */
export function useFinishOnboarding(): () => void {
  const reset = useOnboardingStore((state) => state.reset);
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);

  return useCallback(() => {
    void markOnboarded().catch(() => undefined);
    completeOnboarding();
    reset();
  }, [completeOnboarding, reset]);
}
