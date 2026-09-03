import type { ApiLiveExercise, ApiLiveSet } from '@/api/types';
import { formatElapsed } from '@/lib/format';

/* ------------------------------------------------------------------ *
 * The live session, from the coach's seat.
 * ------------------------------------------------------------------ */

/** "Upper A · Push focus · 24:18 elapsed · sets update live". */
export function liveHeaderLine(title: string, elapsedMs: number): string {
  return `${title} · ${formatElapsed(elapsedMs)} elapsed · sets update live`;
}

/** "Maya Andersson" → "Maya". Buttons address a person, not a record. */
export function firstName(name: string): string {
  const trimmed = name.trim();
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function completedSets(sets: readonly ApiLiveSet[]): number {
  return sets.filter((set) => set.completed).length;
}

/** "2 of 4", composed the same way the API composes `progress`. */
export function setProgress(sets: readonly ApiLiveSet[]): string {
  return `${completedSets(sets)} of ${sets.length}`;
}

/**
 * Whether the session still has anything to watch. A coach who opens the live
 * screen a minute after the last set is not looking at a broken page — they are
 * looking at a workout that ended, and the screen should say so.
 */
export function hasLiveWork(exercises: readonly ApiLiveExercise[]): boolean {
  return exercises.length > 0;
}
