import type { ApiSessionExercise, ApiSessionSet } from '@/api/types';

export type SessionSetDraft = Record<string, readonly ApiSessionSet[]>;

/**
 * The draft store is the authority for a set the lifter has touched; the
 * server session fills in everything they have not. One place decides, so the
 * set rows, the volume total and the resume banner never disagree.
 */
export function resolveSets(
  exercise: ApiSessionExercise,
  draft: SessionSetDraft,
): readonly ApiSessionSet[] {
  return draft[exercise.id] ?? exercise.sets;
}

export function draftFromExercises(exercises: readonly ApiSessionExercise[]): SessionSetDraft {
  return Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets]));
}

export interface SetCounts {
  readonly completed: number;
  readonly total: number;
}

export function countSets(
  exercises: readonly ApiSessionExercise[],
  draft: SessionSetDraft,
): SetCounts {
  return exercises.reduce<SetCounts>(
    (acc, exercise) => {
      const sets = resolveSets(exercise, draft);
      return {
        completed: acc.completed + sets.filter((set) => set.completed).length,
        total: acc.total + sets.length,
      };
    },
    { completed: 0, total: 0 },
  );
}

/** Completed sets only — a set you have not done has not moved any weight. */
export function totalVolumeKg(
  exercises: readonly ApiSessionExercise[],
  draft: SessionSetDraft,
): number {
  return exercises.reduce(
    (total, exercise) =>
      total +
      resolveSets(exercise, draft).reduce(
        (sum, set) => (set.completed ? sum + set.weightKg * set.reps : sum),
        0,
      ),
    0,
  );
}
