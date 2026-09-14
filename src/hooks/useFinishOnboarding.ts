import { useCallback } from 'react';

import { saveClientProfile, saveCoachProfile } from '@/api/onboarding';
import { markOnboarded } from '@/api/users';
import { unitFromOnboarding } from '@/lib/onboarding';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * The one way out of onboarding.
 *
 * Three screens end the flow — a client attaching to a coach, a client
 * skipping that, and a coach finishing setup — and each has to do the same
 * things: save what was answered, stamp `users.onboarded_at`, lower the gate,
 * and clear the draft so a second signup on this device does not inherit the
 * first one's answers.
 *
 * The writes are fire-and-forget. Someone who has finished onboarding should
 * not be held at the last screen because a request failed, and the gate is
 * lowered locally either way — worst case `onboarded_at` stays null and they
 * are asked again on the next cold start, which is the behaviour that was
 * already documented here.
 */
export function useFinishOnboarding(): () => void {
  const reset = useOnboardingStore((state) => state.reset);
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const setUnit = useSettingsStore((state) => state.setUnit);
  const setNeedsOnboarding = useAuthStore((state) => state.setNeedsOnboarding);

  return useCallback(() => {
    const draft = useOnboardingStore.getState();

    if (draft.role === 'coach') {
      void saveCoachProfile({
        gym: draft.coachGym,
        bio: draft.coachBio,
        specialties: draft.specialties,
      }).catch(() => undefined);
    } else {
      void saveClientProfile({
        goals: draft.goals,
        experience: draft.experience,
        sessionsPerWeek: draft.sessionsPerWeek,
      }).catch(() => undefined);

      // Units are not a profile column. They already have a home in the
      // settings store, which syncs through `public.cache` to this person's
      // other devices — a second copy would be a preference with two sources
      // of truth. Until now the choice on the targets screen reached neither.
      setUnit(unitFromOnboarding(draft.units));
    }

    void markOnboarded().catch(() => undefined);
    setNeedsOnboarding(false);
    completeOnboarding();
    reset();
  }, [completeOnboarding, reset, setNeedsOnboarding, setUnit]);
}
