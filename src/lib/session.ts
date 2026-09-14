import { randomUUID } from 'expo-crypto';

import type { ApiSessionExercise, ApiSessionSet } from '@/api/types';
import { displayWeight, storedWeight, weightStep, type WeightUnit } from '@/lib/units';

export type SessionSetDraft = Record<string, readonly ApiSessionSet[]>;

const DEFAULT_SET_COUNT = 3;
const DEFAULT_REPS = 8;

/**
 * An exercise added mid-workout.
 *
 * The id is minted here rather than by the server so that the optimistic
 * insert, the draft store and the rendered card all agree on it from the first
 * frame — a temporary id swapped out when the response lands would strand the
 * sets already keyed under it.
 *
 * A real UUID, because that id is what goes into `workout_exercises.id`: the
 * row the phone drew and the row the database stores are the same row, so the
 * note and the sets written next need nothing reconciled.
 *
 * Three sets at zero kilos: a weight nobody chose is worse than a blank one,
 * and zero is also the right answer for a bodyweight movement. The lifter taps
 * the chip to set it.
 */
export function newSessionExercise(
  name: string,
  exerciseId: string | null = null,
): ApiSessionExercise {
  return {
    id: randomUUID(),
    name: name.trim(),
    // Which catalogue entry it was picked from, so the preview works even
    // after somebody renames their copy. NULL when it was typed.
    exerciseId,
    // Added on the spot, so nobody has left a cue on it yet.
    coachNote: null,
    ownNote: null,
    sets: Array.from({ length: DEFAULT_SET_COUNT }, (_unused, index) => ({
      n: index + 1,
      weightKg: 0,
      reps: DEFAULT_REPS,
      completed: false,
    })),
  };
}

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

/* ------------------------------------------------------------------ *
 * The set editor. Load and reps are edited one at a time and written
 * as separate fields, so a PR on either stays comparable with every
 * other session — a single combined edit would let one drift with the
 * other and make "best set" meaningless.
 * ------------------------------------------------------------------ */

export type SetField = 'weight' | 'reps';

/**
 * Stepping and parsing a set, in whatever unit the person is reading.
 *
 * Both take and return **kilograms**, because that is what is stored and what
 * every other part of the app compares. The unit only decides how far one tap
 * moves and how to read what was typed — so somebody on pounds nudges by 5 lb
 * and types 225, and the database still receives 102.06 kg.
 *
 * Doing it here rather than in the bar keeps the one conversion that can
 * corrupt data in a file with tests around it.
 */
export function stepSetValue(
  field: SetField,
  valueKg: number,
  direction: 1 | -1,
  unit: WeightUnit = 'kg',
): number {
  if (field === 'reps') {
    return Math.max(0, Math.round(valueKg) + direction);
  }

  // Stepped in the shown unit so the number a person watches moves in whole
  // plates, then converted back. Stepping in kilograms and displaying pounds
  // would walk 2.5 kg at a time and read 5.5, 11.0, 16.5 lb.
  const shown = displayWeight(valueKg, unit) + direction * weightStep(unit);
  return Math.max(0, storedWeight(Number(shown.toFixed(1)), unit));
}

/**
 * An extra set on an exercise already under way.
 *
 * It copies the load and reps of the set before it, because that is what an
 * extra set nearly always is — one more of the same. Changing it is two taps
 * on the chips; starting from zero would be two taps every single time.
 */
export function nextSetFor(sets: readonly ApiSessionSet[]): ApiSessionSet {
  const last = sets[sets.length - 1];

  return {
    n: (last?.n ?? 0) + 1,
    weightKg: last?.weightKg ?? 0,
    reps: last?.reps ?? DEFAULT_REPS,
    completed: false,
  };
}

/**
 * A number typed into the set editor, or `null` when there is nothing usable
 * in the box yet.
 *
 * `null` is not an error to show — it is a half-typed field. The editor keeps
 * the last good value and writes nothing until the text parses, so backspacing
 * to empty on the way to a new number never logs a zero.
 */
export function parseSetInput(
  field: SetField,
  text: string,
  unit: WeightUnit = 'kg',
): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed.length === 0) return null;

  if (field === 'reps') {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  // Rounded in the unit it was typed in, then converted: a person entering
  // 62.5 gets 62.5 back, not 62.5 dragged through two conversions.
  return storedWeight(Number(parsed.toFixed(1)), unit);
}

/**
 * The note lines under an exercise name — the coach's cue, the client's own,
 * or "No note" when there is neither. Both can be present, and each is
 * attributed, because "pause 1s on chest" from your coach and "elbows tucked"
 * from yourself are not the same kind of instruction.
 */
export function exerciseNoteLines(exercise: ApiSessionExercise): readonly string[] {
  const lines: string[] = [];

  if (exercise.coachNote && exercise.coachNote.trim().length > 0) {
    lines.push(`Coach note: ${exercise.coachNote.trim()}`);
  }
  if (exercise.ownNote && exercise.ownNote.trim().length > 0) {
    lines.push(`Your note: ${exercise.ownNote.trim()}`);
  }

  return lines.length > 0 ? lines : ['No note'];
}

/** "2/3" — how far through this exercise, for the card's top-right corner. */
export function setProgressLabel(sets: readonly ApiSessionSet[]): string {
  return `${sets.filter((set) => set.completed).length}/${sets.length}`;
}

/**
 * One flag per exercise: true once every set in it is ticked. Drives the dots
 * on the resume banner, so a glance says how much of the workout is behind you
 * without counting sets.
 *
 * An exercise with no sets is never complete — there is nothing in it to have
 * done, and `[].every()` would otherwise call it finished.
 */
export function exerciseCompletion(
  exercises: readonly ApiSessionExercise[],
  draft: SessionSetDraft,
): readonly boolean[] {
  return exercises.map((exercise) => {
    const sets = resolveSets(exercise, draft);
    return sets.length > 0 && sets.every((set) => set.completed);
  });
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
