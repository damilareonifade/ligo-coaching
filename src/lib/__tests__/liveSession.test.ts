import type { ApiLiveSet } from '@/api/types';
import {
  completedSets,
  firstName,
  hasLiveWork,
  liveHeaderLine,
  setProgress,
} from '@/lib/liveSession';

const sets: readonly ApiLiveSet[] = [
  { id: 's1', n: 1, weightKg: 60, reps: 8, completed: true, changedByCoach: false },
  { id: 's2', n: 2, weightKg: 62.5, reps: 8, completed: true, changedByCoach: false },
  { id: 's3', n: 3, weightKg: 62.5, reps: 8, completed: false, changedByCoach: false },
  { id: 's4', n: 4, weightKg: 62.5, reps: 8, completed: false, changedByCoach: false },
];

describe('live header', () => {
  it('reads the session, the clock and the promise in one line', () => {
    expect(liveHeaderLine('Upper A · Push focus', 24 * 60_000 + 18_000)).toBe(
      'Upper A · Push focus · 24:18 elapsed · sets update live',
    );
  });

  it('carries the hour once a session runs long', () => {
    expect(liveHeaderLine('Upper A', 3_600_000 + 7 * 60_000 + 42_000)).toBe(
      'Upper A · 1:07:42 elapsed · sets update live',
    );
  });
});

describe('addressing the client', () => {
  it('uses a first name on a button', () => {
    expect(firstName('Maya Andersson')).toBe('Maya');
  });

  it('copes with a single-word name', () => {
    expect(firstName('Maya')).toBe('Maya');
  });

  it('trims before splitting', () => {
    expect(firstName('  Maya Andersson  ')).toBe('Maya');
  });
});

describe('set progress', () => {
  it('counts what has actually landed', () => {
    expect(completedSets(sets)).toBe(2);
    expect(setProgress(sets)).toBe('2 of 4');
  });

  it('reads zero before the first set', () => {
    expect(setProgress(sets.map((set) => ({ ...set, completed: false })))).toBe('0 of 4');
  });
});

describe('whether there is anything to watch', () => {
  it('is false for a session with no exercises', () => {
    expect(hasLiveWork([])).toBe(false);
  });

  it('is true once there is one', () => {
    expect(
      hasLiveWork([{ id: 'lex-bench', name: 'Bench press', note: '4 × 8', progress: '2 of 4', sets }]),
    ).toBe(true);
  });
});
