import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ApiSetLog } from '@/api/types';

import { mmkvStorage } from './mmkvStorage';

interface SessionDraftState {
  readonly sessionId: string | null;
  readonly sets: readonly ApiSetLog[];
  readonly start: (sessionId: string) => void;
  readonly recordSet: (set: ApiSetLog) => void;
  readonly clear: () => void;
}

/**
 * The in-progress workout. Persisted because a coach can lose the app
 * mid-session (call, battery, backgrounding) and must not lose logged sets.
 */
export const useSessionDraftStore = create<SessionDraftState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      sets: [],
      start: (sessionId) => {
        if (get().sessionId === sessionId) return;
        set({ sessionId, sets: [] });
      },
      recordSet: (logged) => set({ sets: [...get().sets, logged] }),
      clear: () => set({ sessionId: null, sets: [] }),
    }),
    {
      name: 'ligo.session-draft',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
