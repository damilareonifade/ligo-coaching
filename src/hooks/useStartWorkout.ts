import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { errorMessage } from '@/api/client';
import { useStartSessionMutation } from '@/api/clientTraining';
import { useClientSessionStore } from '@/store/clientSessionStore';
import { useUiStore } from '@/store/uiStore';

export interface StartWorkout {
  readonly start: (planId: string) => void;
  /**
   * The plan or routine id currently starting, `null` when none is. The Train
   * tab has one start button per routine, and only the one that was tapped
   * should be spinning.
   */
  readonly pendingPlanId: string | null;
}

/**
 * "Start workout" is the same gesture from Today and from Train, so the
 * mutation, the draft-store handoff and the navigation live in one place.
 */
export function useStartWorkout(): StartWorkout {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const startDraft = useClientSessionStore((state) => state.start);
  const { mutateAsync, isPending, variables } = useStartSessionMutation();

  const start = useCallback(
    (planId: string) => {
      void (async () => {
        try {
          const session = await mutateAsync({ planId });
          startDraft(session.id);
          // Inside the Train tab's stack, so the tab bar stays under the workout.
          router.push(`/train/session/${session.id}`);
        } catch (error) {
          showToast(errorMessage(error), 'danger');
        }
      })();
    },
    [mutateAsync, router, showToast, startDraft],
  );

  // Read off the mutation's own variables rather than a second piece of state:
  // there is only ever one start in flight, and it already knows which it is.
  const pendingPlanId = isPending ? (variables?.planId ?? null) : null;

  return { start, pendingPlanId };
}
