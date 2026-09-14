import type { ApiRoutineInstance } from '@/api/types';
import {
  countThisWeek,
  lastDoneLabel,
  nextInRotation,
  startOfWeek,
  summariseRoutines,
} from '@/lib/rotation';

function instance(
  id: string,
  orderIndex: number,
  lastCompletedAt: string | null,
  templateId: string | null = 'pg-1',
): ApiRoutineInstance {
  return {
    id,
    templateId,
    clientId: 'c1',
    name: id,
    note: null,
    blocks: [],
    orderIndex,
    lastCompletedAt,
    baseVersion: null,
    diverged: false,
    pendingUpdate: null,
  };
}

const day = (n: number) => new Date(2026, 8, n).toISOString();

/**
 * The whole schedule, such as it is. A program is a rotation the client works
 * through at their own pace — nothing is due on a day, so nothing can be
 * missed, and the only question the app answers is "what next".
 */
describe('nextInRotation', () => {
  it('starts at the top of a cycle nobody has begun', () => {
    expect(
      nextInRotation([instance('b', 1, null), instance('a', 0, null), instance('c', 2, null)]),
    ).toBe('a');
  });

  it('suggests whatever has gone longest without being done', () => {
    expect(
      nextInRotation([
        instance('a', 0, day(10)),
        instance('b', 1, day(4)),
        instance('c', 2, day(8)),
      ]),
    ).toBe('b');
  });

  it('puts a never-done routine ahead of one done long ago', () => {
    expect(nextInRotation([instance('a', 0, day(1)), instance('b', 1, null)])).toBe('b');
  });

  /** The case that motivated the whole model: a skipped day is not a problem. */
  it('keeps suggesting a skipped routine until it is actually done', () => {
    const skipped = instance('a', 0, null);
    const done = instance('b', 1, day(12));

    // Skipped A, did B instead — A is still what comes next.
    expect(nextInRotation([skipped, done])).toBe('a');
  });

  it('moves on once it is done, whenever that happens', () => {
    expect(nextInRotation([instance('a', 0, day(13)), instance('b', 1, day(12))])).toBe('b');
  });

  it('leaves the client’s own routines out of the queue', () => {
    // Theirs to run whenever; the app should not nag about a plan nobody set.
    expect(nextInRotation([instance('mine', 0, null, null)])).toBeNull();
    expect(
      nextInRotation([instance('mine', 0, null, null), instance('theirs', 1, null)]),
    ).toBe('theirs');
  });

  it('has nothing to suggest when nothing is assigned', () => {
    expect(nextInRotation([])).toBeNull();
  });
});

describe('the week', () => {
  it('starts on Monday', () => {
    // 2026-09-12 is a Saturday.
    expect(startOfWeek(new Date(2026, 8, 12)).getDate()).toBe(7);
    // Sunday belongs to the week that just ended, not the one starting.
    expect(startOfWeek(new Date(2026, 8, 13)).getDate()).toBe(7);
    expect(startOfWeek(new Date(2026, 8, 14)).getDate()).toBe(14);
  });

  it('counts only sessions inside it', () => {
    const now = new Date(2026, 8, 12, 12);
    expect(
      countThisWeek(
        [
          new Date(2026, 8, 6).toISOString(), // last week
          new Date(2026, 8, 8).toISOString(),
          new Date(2026, 8, 11).toISOString(),
        ],
        now,
      ),
    ).toBe(2);
  });

  it('counts two sessions of the same routine as two', () => {
    const now = new Date(2026, 8, 12, 12);
    const twice = [new Date(2026, 8, 9).toISOString(), new Date(2026, 8, 10).toISOString()];
    expect(countThisWeek(twice, now)).toBe(2);
  });

  it('ignores anything unparseable rather than counting it', () => {
    expect(countThisWeek(['not a date'], new Date(2026, 8, 12))).toBe(0);
  });
});

/** No "overdue", no "late" — the client chose not to do it yet. */
describe('lastDoneLabel', () => {
  const now = new Date(2026, 8, 12);

  it('says never rather than nothing', () => {
    expect(lastDoneLabel(null, now)).toBe('Never done');
  });

  it('reads in days, then weeks', () => {
    expect(lastDoneLabel(new Date(2026, 8, 12, 8).toISOString(), now)).toBe('Last done today');
    expect(lastDoneLabel(new Date(2026, 8, 11).toISOString(), now)).toBe('Last done yesterday');
    expect(lastDoneLabel(new Date(2026, 8, 9).toISOString(), now)).toBe('Last done 3 days ago');
    expect(lastDoneLabel(new Date(2026, 8, 1).toISOString(), now)).toBe('Last done 1 week ago');
    expect(lastDoneLabel(new Date(2026, 7, 20).toISOString(), now)).toBe('Last done 3 weeks ago');
  });
});

/**
 * The Train tab's cards. Two of the three derived facts are about the whole
 * set — which routine is next, and the coach's before the client's own — which
 * is why this takes the list rather than one instance at a time.
 */
describe('summariseRoutines', () => {
  it("puts the coach's routines above the client's own", () => {
    const cards = summariseRoutines(
      [instance('mine', 0, null, null), instance('theirs', 1, null)],
      () => 'Sam',
    );

    expect(cards.map((card) => card.id)).toEqual(['theirs', 'mine']);
    expect(cards.map((card) => card.owner)).toEqual(['coach', 'you']);
  });

  it('marks exactly one routine as next, and never the client’s own', () => {
    const cards = summariseRoutines(
      [instance('a', 0, day(1)), instance('b', 1, day(5)), instance('own', 2, null, null)],
      () => 'Sam',
    );

    expect(cards.filter((card) => card.isCurrent).map((card) => card.id)).toEqual(['a']);
  });

  it('names the coach a routine came from, and says when it has been edited', () => {
    const [untouched, edited] = summariseRoutines(
      [
        instance('a', 0, null),
        { ...instance('b', 1, null), diverged: true },
      ],
      () => 'Ada',
    );

    expect(untouched.sourceLabel).toBe('From Ada');
    expect(edited.sourceLabel).toBe('From Ada · edited by you');
  });

  it('still says where a routine came from once the coach is gone', () => {
    const [card] = summariseRoutines([instance('a', 0, null)], () => null);
    expect(card.sourceLabel).toBe('From your coach');
  });

  it('labels a routine the client built as theirs, edits and all', () => {
    const [card] = summariseRoutines(
      [{ ...instance('a', 0, null, null), diverged: true }],
      () => 'Sam',
    );
    expect(card.sourceLabel).toBe('Yours');
  });

  it('previews the first three lifts, so the card can be read without opening it', () => {
    const blocks = ['Bench', 'Row', 'Squat', 'Curl'].map((name, index) => ({
      id: `b${index}`,
      name,
      scheme: '3 × 10',
      rpe: '',
      targetKg: null,
      note: null,
    }));

    const [card] = summariseRoutines([{ ...instance('a', 0, null), blocks }], () => 'Sam');
    expect(card.preview.map((row) => row.name)).toEqual(['Bench', 'Row', 'Squat']);
  });
});
