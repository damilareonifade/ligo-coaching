import {
  NotAHevyExportError,
  parseCsv,
  parseHevyDate,
  parseHevyExport,
} from '@/lib/importHevy';

/**
 * A slice of a real Hevy export — same columns, same quirks, fewer rows.
 *
 * Inline rather than a file read: `tsconfig` deliberately does not pull in
 * Node's types, and adding them so a test can call `readFileSync` would put
 * `Buffer` and `process` in scope for every React Native file in the app.
 *
 * Every oddity here is one their exporter actually produces — the comma inside
 * a quoted timestamp, the truncated "Lower body (Glute focused" title, a
 * treadmill row with no load or reps, a carry with no reps, a machine whose
 * later sets lost their weight, and a fractional load.
 */
const sample = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Upper body","15 Sep 2026, 06:26","15 Sep 2026, 08:08","","Incline Bench Press (Dumbbell)",,"",0,"normal",10,15,,,
"Upper body","15 Sep 2026, 06:26","15 Sep 2026, 08:08","","Incline Bench Press (Dumbbell)",,"",1,"normal",15,10,,,
"Upper body","15 Sep 2026, 06:26","15 Sep 2026, 08:08","","Face Pull",,"",0,"normal",45,15,,,
"Upper body","15 Sep 2026, 06:26","15 Sep 2026, 08:08","","Farmers Walk",,"",0,"normal",30,,0.03,,
"Upper body","15 Sep 2026, 06:26","15 Sep 2026, 08:08","","Treadmill",,"",0,"normal",,,6,3600,
"Lower body (Glute focused","14 Sep 2026, 07:17","14 Sep 2026, 07:32","","Hip Thrust (Barbell)",,"",0,"normal",100,12,,,
"Lower body (Glute focused","14 Sep 2026, 07:17","14 Sep 2026, 07:32","","Box Jump",,"",0,"normal",,5,,,
"Upper body (2)","11 Sep 2026, 06:28","11 Sep 2026, 07:43","","Pull Up",,"note here",0,"normal",,10,,,
"Lower body (Glute focused","7 Sep 2026, 06:26","7 Sep 2026, 07:32","","Hip Abduction (Machine)",,"",0,"normal",70,20,,,
"Lower body (Glute focused","7 Sep 2026, 06:26","7 Sep 2026, 07:32","","Hip Abduction (Machine)",,"",1,"normal",,20,,,
"Lower body (Glute focused","7 Sep 2026, 06:26","7 Sep 2026, 07:32","","Farmers Walk",,"",0,"normal",27.5,,0.03,,`;

describe('parseCsv', () => {
  /**
   * The reason this is not `split(',')`: Hevy's own timestamps contain commas
   * inside their quotes, so the naive version shears every row in two.
   */
  it('keeps a comma that lives inside a quoted field', () => {
    const [, first] = parseCsv(sample);

    expect(first[1]).toBe('15 Sep 2026, 06:26');
  });

  it('reads a doubled quote as one literal quote', () => {
    expect(parseCsv('"a""b"')[0][0]).toBe('a"b');
  });

  it('handles CRLF, which a file through Windows or mail will have', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps a last row with no trailing newline', () => {
    expect(parseCsv('a,b\nc,d')).toHaveLength(2);
  });
});

describe('parseHevyDate', () => {
  it('reads their format', () => {
    expect(parseHevyDate('15 Sep 2026, 06:26')).toContain('2026-09-15');
  });

  /**
   * Hand-rolled rather than given to `new Date()`, which parses this on some
   * engines and returns Invalid Date on others — and a silently unparsed date
   * would land a decade of training on the epoch.
   */
  it('refuses what it cannot read rather than guessing', () => {
    expect(parseHevyDate('sometime last Tuesday')).toBeNull();
    expect(parseHevyDate('15 Xxx 2026, 06:26')).toBeNull();
    expect(parseHevyDate('')).toBeNull();
  });
});

describe('parseHevyExport', () => {
  const result = parseHevyExport(sample);

  it('groups rows into the sessions they belong to', () => {
    expect(result.sessions).toHaveLength(4);
    expect(result.sessions[0].title).toBe('Upper body');
    expect(result.sessions[0].finishedAt).toContain('2026-09-15');
  });

  it('groups sets under the exercise, in the order performed', () => {
    const [upper] = result.sessions;

    expect(upper.exercises.map((e) => e.name)).toEqual([
      'Incline Bench Press (Dumbbell)',
      'Face Pull',
      'Farmers Walk',
      // Kept now. It used to be dropped for having no load and no reps.
      'Treadmill',
    ]);
    expect(upper.exercises[0].sets).toHaveLength(2);
  });

  it('shifts set numbers off zero, which the column constraint requires', () => {
    expect(result.sessions[0].exercises[0].sets.map((s) => s.n)).toEqual([1, 2]);
  });

  /**
   * A treadmill row used to be thrown away, because SetTrack could only store
   * load × reps. It comes across now, measured in what it actually was.
   */
  it('keeps a cardio entry and says how it is measured', () => {
    const treadmill = result.sessions[0].exercises.find((e) => e.name === 'Treadmill');

    expect(treadmill?.measure).toBe('distance_duration');
    expect(treadmill?.sets[0]).toEqual({
      n: 1,
      weightKg: 0,
      reps: 0,
      distanceKm: 6,
      durationSeconds: 3600,
    });
  });

  it('skips only a row that recorded nothing at all', () => {
    expect(result.skippedRows).toBe(0);
  });

  it('reads the measure off what the rows carried', () => {
    const byName = new Map(
      result.sessions.flatMap((s) => s.exercises).map((e) => [e.name, e.measure]),
    );

    expect(byName.get('Incline Bench Press (Dumbbell)')).toBe('load_reps');
    // Reps and no load: the body is the weight.
    expect(byName.get('Pull Up')).toBe('reps');
    expect(byName.get('Box Jump')).toBe('reps');
    // A load carried a distance is neither of the above.
    expect(byName.get('Farmers Walk')).toBe('load_distance');
    // A machine whose later sets were unloaded is still load × reps.
    expect(byName.get('Hip Abduction (Machine)')).toBe('load_reps');
  });

  it('keeps a bodyweight set, where the missing half is the weight', () => {
    const pullUp = result.sessions[2].exercises[0];

    expect(pullUp.name).toBe('Pull Up');
    expect(pullUp.sets[0]).toEqual({
      n: 1,
      weightKg: 0,
      reps: 10,
      distanceKm: null,
      durationSeconds: null,
    });
  });

  it('keeps a loaded carry, where the missing half is the reps', () => {
    const carry = result.sessions[0].exercises[2];

    expect(carry.name).toBe('Farmers Walk');
    expect(carry.sets[0]).toEqual({
      n: 1,
      weightKg: 30,
      reps: 0,
      distanceKm: 0.03,
      durationSeconds: null,
    });
  });

  it('carries an exercise note across', () => {
    expect(result.sessions[2].exercises[0].note).toBe('note here');
  });

  it('takes a session title verbatim, unbalanced brackets and all', () => {
    // Their own export truncates this one — "Lower body (Glute focused" with
    // no closing bracket. Repairing it would be inventing a name.
    expect(result.sessions[1].title).toBe('Lower body (Glute focused');
  });

  it('counts every set it kept', () => {
    // Eleven data rows, all of which now record something.
    expect(result.setCount).toBe(11);
    expect(result.skippedRows + result.setCount + result.badRows).toBe(11);
  });

  /**
   * From the real export: a machine where the first set was loaded and the
   * rest were not. Dropping the unloaded ones would lose two working sets;
   * dropping the exercise would lose all three.
   */
  it('keeps sets whose weight is missing partway through an exercise', () => {
    const abduction = result.sessions[3].exercises[0];

    expect(abduction.name).toBe('Hip Abduction (Machine)');
    expect(abduction.sets.map((set) => [set.n, set.weightKg, set.reps])).toEqual([
      [1, 70, 20],
      [2, 0, 20],
    ]);
  });

  it('keeps a fractional weight, which plate maths produces', () => {
    const carry = result.sessions[3].exercises[1];

    expect(carry.sets[0].weightKg).toBe(27.5);
  });

  /**
   * Read by header name, never by position — Hevy can add a column in any
   * release, and a parser counting from the left would write reps into the
   * weight field without complaining.
   */
  it('refuses a file that is not one of theirs', () => {
    expect(() => parseHevyExport('date,exercise,load\n2026-01-01,Bench,100')).toThrow(
      NotAHevyExportError,
    );
  });

  it('survives a column being added in front of the ones it needs', () => {
    const shuffled = sample
      .split('\n')
      .map((line, index) => (index === 0 ? `"extra",${line}` : `"x",${line}`))
      .join('\n');

    expect(parseHevyExport(shuffled).sessions).toHaveLength(4);
  });
});
