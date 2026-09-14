import type { ApiSessionExercise } from '@/api/types';
import { displayWeight } from '@/lib/units';
import {
  exerciseCompletion,
  exerciseNoteLines,
  nextSetFor,
  newSessionExercise,
  parseSetInput,
  setProgressLabel,
  stepSetValue,
} from '@/lib/session';

/**
 * The defaults an added exercise arrives with are a product decision, not an
 * implementation detail: they are what the lifter sees on the card before
 * touching anything.
 */
describe('newSessionExercise', () => {
  it('arrives as three empty sets of eight', () => {
    const exercise = newSessionExercise('Cable fly');

    expect(exercise.name).toBe('Cable fly');
    expect(exercise.sets).toHaveLength(3);
    expect(exercise.sets.map((set) => set.n)).toEqual([1, 2, 3]);
    expect(exercise.sets.every((set) => set.reps === 8)).toBe(true);
  });

  it('picks no weight — zero is the lifter to fill in, and right for bodyweight', () => {
    const exercise = newSessionExercise('Pull-up');

    expect(exercise.sets.every((set) => set.weightKg === 0)).toBe(true);
  });

  it('starts nothing completed and claims no PR', () => {
    const exercise = newSessionExercise('Bench press');

    expect(exercise.sets.some((set) => set.completed)).toBe(false);
  });

  it('trims the name the picker handed over', () => {
    expect(newSessionExercise('  Incline DB press  ').name).toBe('Incline DB press');
  });

  it('mints a distinct id each time, so two of the same lift do not collide', () => {
    const first = newSessionExercise('Bench press');
    const second = newSessionExercise('Bench press');

    expect(first.id).not.toBe(second.id);
  });
});

/**
 * The note line carries attribution, because a cue from your coach and a
 * reminder you left yourself are not the same instruction.
 */
describe('exercise note lines', () => {
  const exercise = (
    coachNote: string | null,
    ownNote: string | null,
  ): ApiSessionExercise => ({
    id: 'cex-1',
    name: 'Bench press',
    coachNote,
    ownNote,
    sets: [],
  });

  it('attributes a coach cue', () => {
    expect(exerciseNoteLines(exercise('pause 1s on chest', null))).toEqual([
      'Coach note: pause 1s on chest',
    ]);
  });

  it('attributes your own', () => {
    expect(exerciseNoteLines(exercise(null, 'elbows tucked'))).toEqual([
      'Your note: elbows tucked',
    ]);
  });

  /** The point of keeping the two apart: writing one cannot erase the other. */
  it('shows both when both exist, coach first', () => {
    expect(exerciseNoteLines(exercise('pause 1s on chest', 'elbows tucked'))).toEqual([
      'Coach note: pause 1s on chest',
      'Your note: elbows tucked',
    ]);
  });

  it('says so plainly when there is none', () => {
    expect(exerciseNoteLines(exercise(null, null))).toEqual(['No note']);
    expect(exerciseNoteLines(exercise('   ', '  '))).toEqual(['No note']);
  });
});

describe('set progress label', () => {
  it('counts done against total', () => {
    expect(
      setProgressLabel([
        { n: 1, weightKg: 60, reps: 8, completed: true },
        { n: 2, weightKg: 60, reps: 8, completed: true },
        { n: 3, weightKg: 60, reps: 8, completed: false },
      ]),
    ).toBe('2/3');
  });

  it('handles an exercise with no sets yet', () => {
    expect(setProgressLabel([])).toBe('0/0');
  });
});

describe('stepping a set value', () => {
  it('moves reps one at a time', () => {
    expect(stepSetValue('reps', 8, 1)).toBe(9);
    expect(stepSetValue('reps', 8, -1)).toBe(7);
  });

  it('moves load by a plate pair', () => {
    expect(stepSetValue('weight', 60, 1)).toBe(62.5);
    expect(stepSetValue('weight', 62.5, -1)).toBe(60);
  });

  it('stops at zero rather than going negative', () => {
    expect(stepSetValue('reps', 0, -1)).toBe(0);
    expect(stepSetValue('weight', 0, -1)).toBe(0);
    expect(stepSetValue('weight', 1, -1)).toBe(0);
  });

  it('keeps half-plate loads clean instead of drifting in floats', () => {
    expect(stepSetValue('weight', 0.1 + 0.2, 1)).toBe(2.8);
  });
});

describe('parsing a typed set value', () => {
  it('takes whole reps', () => {
    expect(parseSetInput('reps', '12')).toBe(12);
    expect(parseSetInput('reps', ' 8 ')).toBe(8);
  });

  it('takes half plates, written either way', () => {
    expect(parseSetInput('weight', '97.5')).toBe(97.5);
    expect(parseSetInput('weight', '82,5')).toBe(82.5);
  });

  it('returns null for a box that is not a number yet', () => {
    expect(parseSetInput('reps', '')).toBeNull();
    expect(parseSetInput('reps', '   ')).toBeNull();
    expect(parseSetInput('weight', '-')).toBeNull();
    expect(parseSetInput('weight', 'heavy')).toBeNull();
  });

  it('refuses a negative, which is not a lighter set', () => {
    expect(parseSetInput('weight', '-10')).toBeNull();
    expect(parseSetInput('reps', '-3')).toBeNull();
  });

  it('allows a deliberate zero — a bodyweight set is zero loaded', () => {
    expect(parseSetInput('weight', '0')).toBe(0);
    expect(parseSetInput('reps', '0')).toBe(0);
  });
});

describe('adding a set', () => {
  const set = (n: number, weightKg: number, reps: number) => ({
    n,
    weightKg,
    reps,
    completed: true,
  });

  it('repeats the set before it — one more of the same', () => {
    const added = nextSetFor([set(1, 82.5, 8), set(2, 82.5, 8)]);

    expect(added).toEqual({ n: 3, weightKg: 82.5, reps: 8, completed: false });
  });

  it('never arrives already ticked', () => {
    const added = nextSetFor([set(1, 60, 5)]);

    expect(added.completed).toBe(false);
  });

  it('starts an exercise that has no sets at all', () => {
  });
});

/** The dots on the resume banner — one per exercise, filled when it is done. */
describe('exercise completion', () => {
  const set = (n: number, completed: boolean) => ({
    n,
    weightKg: 60,
    reps: 8,
    completed,
  });

  const exercise = (id: string, sets: ReturnType<typeof set>[]): ApiSessionExercise => ({
    id,
    name: id,
    coachNote: null,
    ownNote: null,
    sets,
  });

  it('marks an exercise done only when every set is', () => {
    expect(
      exerciseCompletion(
        [
          exercise('a', [set(1, true), set(2, true)]),
          exercise('b', [set(1, true), set(2, false)]),
        ],
        {},
      ),
    ).toEqual([true, false]);
  });

  it('never calls an exercise with no sets done', () => {
    expect(exerciseCompletion([exercise('a', [])], {})).toEqual([false]);
  });

  it('reads the draft over the server session', () => {
    const exercises = [exercise('a', [set(1, false)])];
    expect(exerciseCompletion(exercises, { a: [set(1, true)] })).toEqual([true]);
  });
});

/* ------------------------------------------------------------------ *
 * The set editor in pounds. Both of these take and return kilograms —
 * the unit only decides how the number is read and how far a tap moves.
 * ------------------------------------------------------------------ */

describe('stepSetValue in pounds', () => {
  it('moves a whole 5 lb, seen from the reader side', () => {
    const next = stepSetValue('weight', 100, 1, 'lb');

    // 100 kg is 220.5 lb; one tap up is 225.5 lb, which is 102.3 kg.
    expect(displayWeight(next, 'lb')).toBeCloseTo(225.5, 1);
  });

  it('still refuses to go below zero', () => {
    expect(stepSetValue('weight', 0, -1, 'lb')).toBe(0);
  });

  it('leaves reps alone whatever the weight unit', () => {
    expect(stepSetValue('reps', 8, 1, 'lb')).toBe(9);
  });
});

describe('parseSetInput in pounds', () => {
  /** The bug this prevents: 225 typed in a pounds gym stored as 225 kg. */
  it('converts what was typed into kilograms', () => {
    expect(parseSetInput('weight', '225', 'lb')).toBeCloseTo(102.06, 2);
  });

  it('leaves kilograms as typed', () => {
    expect(parseSetInput('weight', '62.5', 'kg')).toBe(62.5);
  });

  it('reads reps as reps', () => {
    expect(parseSetInput('reps', '8', 'lb')).toBe(8);
  });
});
