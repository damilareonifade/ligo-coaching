/* ------------------------------------------------------------------ *
 * Reading a Hevy export.
 *
 * One row per set, with the session repeated on every one:
 *
 *   title, start_time, end_time, description, exercise_title,
 *   superset_id, exercise_notes, set_index, set_type, weight_kg,
 *   reps, distance_km, duration_seconds, rpe
 *
 * Three things about that file are worth knowing before reading the
 * code:
 *
 *   `weight_kg` says its unit in its name. Hevy normalises on export,
 *   so the "is this pounds?" question that would otherwise have to be
 *   asked — and would put every lift out by 2.2× when answered wrong —
 *   does not arise.
 *
 *   `start_time` is "15 Sep 2026, 06:26", which contains a comma. Any
 *   attempt to read this file by splitting on commas produces garbage,
 *   which is why there is a real parser below.
 *
 *   Not every row is load × reps. A treadmill entry has only distance
 *   and duration, a farmers walk has a load and a distance, a pull-up
 *   has reps alone. All four measures come across now, and the
 *   exercise records which of them it is counted in — see
 *   `exercises.measure`. Only a row carrying none of the four is
 *   skipped, because it recorded nothing.
 *
 * Parsed here rather than on the server so it can be tested against a
 * real export — the file in __tests__/fixtures is a slice of one — and
 * so somebody sees what was found before anything is written.
 * ------------------------------------------------------------------ */

import type { SetMeasure } from '@/api/types';

export interface HevySet {
  /** 1-based, because `workout_sets.n` is and Hevy's `set_index` is not. */
  readonly n: number;
  readonly weightKg: number;
  readonly reps: number;
  /** A treadmill, a row, a loaded carry. `null` for the vast majority. */
  readonly distanceKm: number | null;
  readonly durationSeconds: number | null;
}

export interface HevyExercise {
  readonly name: string;
  readonly note: string | null;
  /**
   * How this exercise was measured, worked out from what its rows actually
   * carried rather than from its name. Hevy does not say, and the catalogue's
   * own guess only covers exercises that matched it.
   */
  readonly measure: SetMeasure;
  readonly sets: readonly HevySet[];
}

export type { SetMeasure };

/**
 * What an exercise is measured by, read off the rows.
 *
 * Decided per exercise rather than per set, because a set is one instance of
 * something whose nature does not change halfway through — and because a
 * machine whose first set was loaded and whose others were not is still a
 * load-and-reps exercise.
 */
function measureFor(sets: readonly HevySet[]): SetMeasure {
  const any = (pick: (set: HevySet) => unknown): boolean => sets.some((set) => Boolean(pick(set)));

  const load = any((set) => set.weightKg > 0);
  const reps = any((set) => set.reps > 0);
  const distance = any((set) => set.distanceKm);
  const duration = any((set) => set.durationSeconds);

  if (load && distance) return 'load_distance';
  if (distance) return 'distance_duration';
  if (!load && !reps && duration) return 'duration';
  if (!load && reps) return 'reps';
  return 'load_reps';
}

export interface HevySession {
  /** `start_time` verbatim, which with the title identifies the session. */
  readonly key: string;
  readonly title: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly exercises: readonly HevyExercise[];
}

export interface HevyImport {
  readonly sessions: readonly HevySession[];
  readonly setCount: number;
  /**
   * Rows carrying nothing at all — no load, no reps, no distance, no time.
   * Cardio used to land here, before there was anywhere to put it.
   */
  readonly skippedRows: number;
  /** A row the parser could not make sense of at all. */
  readonly badRows: number;
}

/** Header names this parser needs. A file without them is not a Hevy export. */
const REQUIRED = ['title', 'start_time', 'exercise_title', 'set_index', 'reps'] as const;

export class NotAHevyExportError extends Error {
  constructor(missing: readonly string[]) {
    super(
      `This does not look like a Hevy export — it has no ${missing.join(', ')} column.`,
    );
    this.name = 'NotAHevyExportError';
  }
}

/**
 * A CSV reader, because the obvious shortcut does not work here.
 *
 * Fields are quoted, contain commas ("15 Sep 2026, 06:26") and may contain
 * doubled quotes. Handles CRLF, because a file that has been through Windows
 * or a mail client usually has.
 */
export function parseCsv(text: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside quotes is one literal quote.
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  // A file with no trailing newline still has a last row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim().length > 0));
}

const MONTHS: Readonly<Record<string, number>> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * "15 Sep 2026, 06:26" → ISO.
 *
 * Built by hand rather than handed to `new Date()`: that parses this format on
 * some engines and returns Invalid Date on others, and a silently unparsed
 * date would import a decade of training onto the epoch.
 *
 * The time carries no zone, so it is taken as local — which is what it was
 * when it was logged.
 */
export function parseHevyDate(value: string): string | null {
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4}),?\s*(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const [, day, monthName, year, hour, minute] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;

  const date = new Date(
    Number(year),
    month,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberOrNull(value: string | undefined): number | null {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseHevyExport(text: string): HevyImport {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new NotAHevyExportError(REQUIRED);

  // Read by header name, never by position. Hevy can add a column in any
  // release, and a parser counting from the left would then write reps into
  // the weight field without complaining.
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const missing = REQUIRED.filter((name) => !header.includes(name));
  if (missing.length > 0) throw new NotAHevyExportError(missing);

  const at = (row: readonly string[], name: string): string | undefined => {
    const index = header.indexOf(name);
    return index === -1 ? undefined : row[index];
  };

  // Insertion-ordered, so sessions come out newest-first as the file has them
  // and exercises keep the order they were performed in.
  const sessions = new Map<string, HevySession & { exercises: HevyExercise[] }>();
  let setCount = 0;
  let skippedRows = 0;
  let badRows = 0;

  for (const row of rows.slice(1)) {
    const title = (at(row, 'title') ?? '').trim();
    const rawStart = (at(row, 'start_time') ?? '').trim();
    const name = (at(row, 'exercise_title') ?? '').trim();
    const startedAt = parseHevyDate(rawStart);

    if (!startedAt || name.length === 0) {
      badRows += 1;
      continue;
    }

    const weightKg = numberOrNull(at(row, 'weight_kg'));
    const reps = numberOrNull(at(row, 'reps'));
    const distanceKm = numberOrNull(at(row, 'distance_km'));
    const durationSeconds = numberOrNull(at(row, 'duration_seconds'));

    // A row with none of the four measures recorded nothing, so there is
    // nothing to import. Before `exercises.measure` existed this also caught
    // every treadmill entry, which is why they used to be thrown away.
    if (weightKg === null && reps === null && distanceKm === null && durationSeconds === null) {
      skippedRows += 1;
      continue;
    }

    const key = `${rawStart}|${title}`;
    let session = sessions.get(key);
    if (!session) {
      session = {
        key,
        title: title.length > 0 ? title : 'Workout',
        startedAt,
        finishedAt: parseHevyDate((at(row, 'end_time') ?? '').trim()),
        exercises: [],
      };
      sessions.set(key, session);
    }

    let exercise = session.exercises.find((entry) => entry.name === name);
    if (!exercise) {
      const note = (at(row, 'exercise_notes') ?? '').trim();
      // Replaced below, once every row for this exercise has been read.
      exercise = { name, note: note.length > 0 ? note : null, measure: 'load_reps', sets: [] };
      session.exercises.push(exercise);
    }

    (exercise.sets as HevySet[]).push({
      // Hevy counts from zero; `workout_sets.n` is constrained above it.
      n: (numberOrNull(at(row, 'set_index')) ?? 0) + 1,
      // A bodyweight set has no weight and a loaded carry has no reps. Both
      // are real sets, so the missing half is zero rather than a reason to
      // drop the row.
      weightKg: weightKg ?? 0,
      reps: reps ?? 0,
      distanceKm,
      durationSeconds,
    });
    setCount += 1;
  }

  return {
    // The measure is settled once every row has been seen, since it is read
    // off all of an exercise's sets rather than the first one.
    sessions: [...sessions.values()].map((session) => ({
      ...session,
      exercises: session.exercises.map((exercise) => ({
        ...exercise,
        measure: measureFor(exercise.sets),
      })),
    })),
    setCount,
    skippedRows,
    badRows,
  };
}
