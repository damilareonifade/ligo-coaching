import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ApiSessionSet } from '@/api/types';

import { mmkvStorage } from './mmkvStorage';

interface ClientSessionState {
  readonly sessionId: string | null;
  readonly startedAtMs: number | null;
  /** Local set edits, keyed by exerciseId. Not the server session itself. */
  readonly sets: Record<string, readonly ApiSessionSet[]>;
  readonly start: (sessionId: string) => void;
  /**
   * Seed the draft from the server session. Exercises already carrying local
   * edits are left alone, so a refetch never overwrites what the lifter typed.
   */
  readonly hydrate: (sets: Record<string, readonly ApiSessionSet[]>) => void;
  /** An extra set the lifter decided to do — see `nextSetFor`. */
  readonly addSet: (exerciseId: string, set: ApiSessionSet) => void;
  readonly updateSet: (exerciseId: string, n: number, patch: Partial<ApiSessionSet>) => void;
  readonly toggleSet: (exerciseId: string, n: number) => void;
  readonly finish: () => void;
}

function patchSets(
  sets: Record<string, readonly ApiSessionSet[]>,
  exerciseId: string,
  n: number,
  patch: (set: ApiSessionSet) => ApiSessionSet,
): Record<string, readonly ApiSessionSet[]> {
  const existing = sets[exerciseId];
  if (!existing) return sets;

  return {
    ...sets,
    [exerciseId]: existing.map((set) => (set.n === n ? patch(set) : set)),
  };
}

/**
 * The in-progress workout. Persisted because a lifter loses the app
 * mid-session all the time — a call, a battery dip, a swipe to Spotify —
 * and must come back to the sets they already logged.
 */
export const useClientSessionStore = create<ClientSessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      startedAtMs: null,
      sets: {},

      start: (sessionId) => {
        if (get().sessionId === sessionId) return;
        set({ sessionId, startedAtMs: Date.now(), sets: {} });
      },

      hydrate: (incoming) => {
        const current = get().sets;
        const merged = { ...current };
        let changed = false;

        for (const [exerciseId, sets] of Object.entries(incoming)) {
          if (merged[exerciseId]) continue;
          merged[exerciseId] = sets;
          changed = true;
        }

        if (changed) set({ sets: merged });
      },

      addSet: (exerciseId, added) =>
        set({
          sets: {
            ...get().sets,
            [exerciseId]: [...(get().sets[exerciseId] ?? []), added],
          },
        }),

      updateSet: (exerciseId, n, patch) =>
        set({ sets: patchSets(get().sets, exerciseId, n, (existing) => ({ ...existing, ...patch })) }),

      toggleSet: (exerciseId, n) =>
        set({
          sets: patchSets(get().sets, exerciseId, n, (existing) => ({
            ...existing,
            completed: !existing.completed,
          })),
        }),

      finish: () => set({ sessionId: null, startedAtMs: null, sets: {} }),
    }),
    {
      name: 'ligo.client-session',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
