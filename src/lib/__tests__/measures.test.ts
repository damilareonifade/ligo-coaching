import {
  composeSchemeFor,
  fieldsFor,
  formatDuration,
  measureHint,
  parseDurationInput,
} from '@/lib/measures';

describe('fieldsFor', () => {
  /**
   * The bug this exists to stop: a treadmill was being asked for sets, reps
   * and a working weight — three questions nobody can answer.
   */
  it('asks a run for distance and time, and nothing else', () => {
    expect(fieldsFor('distance_duration')).toEqual({
      sets: false,
      reps: false,
      load: false,
      distance: true,
      duration: true,
    });
  });

  it('asks a bodyweight movement for reps, with no load and no clock', () => {
    expect(fieldsFor('reps')).toEqual({
      sets: true,
      reps: true,
      load: false,
      // Time used to be offered here as a cap, which made a sit-up ask for a
      // duration — while a loaded carry, where a cap is at least as plausible,
      // was never offered one.
      distance: false,
      duration: false,
    });
  });

  it('asks a loaded carry for weight and distance rather than reps', () => {
    const fields = fieldsFor('load_distance');

    expect(fields.load).toBe(true);
    expect(fields.distance).toBe(true);
    expect(fields.reps).toBe(false);
  });

  it('treats an unlabelled exercise as load and reps, which most things are', () => {
    expect(fieldsFor()).toEqual(fieldsFor('load_reps'));
  });
});

describe('formatDuration', () => {
  it('uses the shortest form that is still unambiguous', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(3900)).toBe('1:05:00');
  });
});

describe('composeSchemeFor', () => {
  const base = { sets: 3, reps: 10, distanceKm: null, durationSeconds: null };

  it('keeps the shape everything else already reads', () => {
    expect(composeSchemeFor('load_reps', base)).toBe('3 × 10');
  });

  it('counts a hold in time rather than reps', () => {
    expect(composeSchemeFor('duration', { ...base, durationSeconds: 45 })).toBe('3 × 45s');
  });

  it('gives a run no sets, because nobody prescribes three of a 5km', () => {
    expect(
      composeSchemeFor('distance_duration', { ...base, distanceKm: 5, durationSeconds: 1800 }),
    ).toBe('5 km · 30:00');
  });

  it('reads a carry as sets over a distance', () => {
    expect(composeSchemeFor('load_distance', { ...base, distanceKm: 0.03 })).toBe(
      '3 sets · 0.03 km',
    );
  });

  /** Never empty: a block with nothing set still needs a line. */
  it('falls back to what every existing block already says', () => {
    expect(composeSchemeFor('duration', base)).toBe('3 × 0s');
    expect(composeSchemeFor('distance_duration', base)).toBe('3 × 10');
  });
});

describe('measureHint', () => {
  it('stops naming RPE while nothing asks for one', () => {
    expect(measureHint('load_reps', 'kg')).toBe(
      'kg is optional. Leave it blank and nothing is prescribed.',
    );
  });

  it('names the reader’s own unit rather than kilograms', () => {
    expect(measureHint('load_reps', 'lb')).toContain('lb is optional');
  });
});

describe('parseDurationInput', () => {
  it('takes the time in whatever shape a coach thinks in', () => {
    expect(parseDurationInput('45')).toBe(45);
    expect(parseDurationInput('45s')).toBe(45);
    expect(parseDurationInput('1:30')).toBe(90);
    expect(parseDurationInput('30:00')).toBe(1800);
    expect(parseDurationInput('1:05:00')).toBe(3900);
    expect(parseDurationInput('20m')).toBe(1200);
  });

  it('reads an empty box as no target, which is a real answer', () => {
    expect(parseDurationInput('')).toBeNull();
    expect(parseDurationInput('   ')).toBeNull();
  });

  it('refuses what it cannot read rather than inventing a number', () => {
    expect(parseDurationInput('a while')).toBeNull();
    expect(parseDurationInput('0')).toBeNull();
  });

  /** The round trip the editor depends on: seed the box, read it back. */
  it('round-trips through formatDuration', () => {
    for (const seconds of [45, 90, 1800, 3900]) {
      expect(parseDurationInput(formatDuration(seconds))).toBe(seconds);
    }
  });
});
