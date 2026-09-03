import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { errorMessage } from '@/api/client';
import { useStartSessionMutation } from '@/api/clientTraining';
import { useClientSessionStore } from '@/store/clientSessionStore';
import { useUiStore } from '@/store/uiStore';

export interface StartWorkout {
  readonly start: (planId: string) => void;
  readonly isPending: boolean;
}

/**
 * "Start workout" is the same gesture from Today and from Train, so the
 * mutation, the draft-store handoff and the navigation live in one place.
 */
export function useStartWorkout(): StartWorkout {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const startDraft = useClientSessionStore((state) => state.start);
  const { mutateAsync, isPending } = useStartSessionMutation();

  const start = useCallback(
    (planId: string) => {
      void (async () => {
        try {
          const session = await mutateAsync({ planId });
          startDraft(session.id);
          router.push(`/session/${session.id}`);
        } catch (error) {
          showToast(errorMessage(error), 'danger');
        }
      })();
    },
    [mutateAsync, router, showToast, startDraft],
  );

  return { start, isPending };
}
