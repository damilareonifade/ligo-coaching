import type { SetMeasure } from '@/api/types';

/* ------------------------------------------------------------------ *
 * What a measure means to a screen.
 *
 * `exercises.measure` says how an exercise is counted. Everything in
 * this file is the consequence: which fields the builder should ask
 * for, how a prescription reads, and which numbers mean anything.
 *
 * Kept apart from the builder so the session screen, the block row and
 * the summary line cannot disagree about whether a treadmill has reps.
 * ------------------------------------------------------------------ */

export type { SetMeasure };

/** The default for anything unlabelled, and what almost everything is. */
export const DEFAULT_MEASURE: SetMeasure = 'load_reps';

const MEASURES: readonly SetMeasure[] = [
  'load_reps',
  'reps',
  'duration',
  'distance_duration',
  'load_distance',
];

/**
 * `exercises.measure` is a text column with a check constraint, which reaches
 * TypeScript as `string`. Narrowed here rather than cast: a value the app does
 * not know is a value it should treat as load × reps, not one it should carry
 * around pretending to be a measure.
 */
export function toMeasure(value: string | null | undefined): SetMeasure {
  return MEASURES.find((measure) => measure === value) ?? DEFAULT_MEASURE;
}

export interface MeasureFields {
  readonly sets: boolean;
  readonly reps: boolean;
  readonly load: boolean;
  readonly distance: boolean;
  readonly duration: boolean;
}

/**
 * Which boxes a coach should be given.
 *
 * A treadmill was being asked for sets, reps and a working weight, which is
 * three questions nobody can answer. Absent fields are absent rather than
 * disabled: a greyed-out box still reads as something you are failing to fill
 * in.
 */
export function fieldsFor(measure: SetMeasure = DEFAULT_MEASURE): MeasureFields {
  switch (measure) {
    case 'reps':
      // No load — the body is the weight, and a target for it is meaningless.
      //
      // No time either. It was offered here as a cap ("as many push-ups as you
      // can in 60s"), but that made a sit-up ask for a duration nobody had
      // thought about, while a loaded carry — where a time cap is at least as
      // plausible — was never offered one. Time now appears only where it is
      // part of how the movement is counted.
      return { sets: true, reps: true, load: false, distance: false, duration: false };
    case 'duration':
      return { sets: true, reps: false, load: false, distance: false, duration: true };
    case 'distance_duration':
      // No sets either. Nobody prescribes three sets of a 5km run.
      return { sets: false, reps: false, load: false, distance: true, duration: true };
    case 'load_distance':
      return { sets: true, reps: false, load: true, distance: true, duration: false };
    case 'load_reps':
    default:
      return { sets: true, reps: true, load: true, distance: false, duration: false };
  }
}

/** "45s" | "1:30" | "1:05:00" — the shortest form that is still unambiguous. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${minutes}:${String(rest).padStart(2, '0')}`;
}

/**
 * What a coach typed into the time box, in seconds.
 *
 * Deliberately generous, because a plank and a treadmill share one field and
 * nobody thinks of half an hour as 1,800 of anything: "45" and "45s" are
 * seconds, "1:30" and "30:00" are minutes and seconds, "1:05:00" has hours,
 * and "20m" is twenty minutes. `null` for a box left empty — no target, which
 * is a real answer.
 *
 * The inverse is `formatDuration`, and the round trip holds: 45 → "45s" → 45,
 * 1800 → "30:00" → 1800.
 */
export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return null;

  const clock = /^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/.exec(trimmed);
  if (clock) {
    const [, first, second, third] = clock;
    return third === undefined
      ? Number(first) * 60 + Number(second)
      : Number(first) * 3600 + Number(second) * 60 + Number(third);
  }

  const plain = /^(\d+(?:\.\d+)?)\s*(s|sec|secs|m|min|mins)?$/.exec(trimmed);
  if (!plain) return null;

  const amount = Number(plain[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const minutes = plain[2] === 'm' || plain[2] === 'min' || plain[2] === 'mins';
  return Math.round(minutes ? amount * 60 : amount);
}

/**
 * Kilometres, to the three decimals the column holds — which is metres, and
 * the resolution a 20m farmers walk needs. Zero is no target, not a distance.
 */
export function parseDistanceInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(3));
}

/** The other direction, for seeding the box. `null` shows it empty. */
export function formatDistanceInput(km: number | null | undefined): string {
  return km === null || km === undefined ? '' : String(km);
}

export function formatDurationInput(seconds: number | null | undefined): string {
  return seconds === null || seconds === undefined ? '' : formatDuration(seconds);
}

/**
 * Whether a coach is asked for an RPE.
 *
 * Parked, not removed. Nothing about RPE has been deleted — the column, the
 * `composeRpe`/`parseRpe` pair, the save payloads and the badge on a block
 * that already carries one are all still here, so an existing prescription
 * stays visible and nothing has to be rebuilt to bring the field back. This
 * constant only decides whether the builder *asks*.
 *
 * A constant rather than an `EXPO_PUBLIC_FEATURE_*` flag: those answer "does
 * this part of the app exist yet" for a whole domain, and one field inside a
 * feature that does exist is not that.
 */
export const RPE_PRESCRIBING = false;

/**
 * The line under the fields, which differs because what is optional differs.
 * A run has no load to leave blank, so saying so there would be noise.
 *
 * Takes the weight unit rather than naming kilograms: the reader chose one,
 * and the box above this line is already labelled with it.
 */
export function measureHint(
  measure: SetMeasure = DEFAULT_MEASURE,
  weightUnit = 'kg',
): string {
  switch (measure) {
    case 'distance_duration':
      return 'How far, how long, or both. A run is one effort, not three sets.';
    case 'duration':
      return 'Time per set — 45s, or 1:30. Leave it blank and the hold is theirs to pick.';
    case 'load_distance':
      return 'Carried weight and ground covered. Both optional.';
    case 'reps':
      return 'No weight to set — the load is their own body.';
    case 'load_reps':
    default:
      return RPE_PRESCRIBING
        ? `${weightUnit} and RPE are optional. Leave them blank and nothing is prescribed.`
        : `${weightUnit} is optional. Leave it blank and nothing is prescribed.`;
  }
}

export interface Prescription {
  readonly sets: number;
  readonly reps: number;
  readonly distanceKm: number | null;
  readonly durationSeconds: number | null;
}

/**
 * What a coach prescribed, in the words of the measure.
 *
 * `scheme` holds this as text — "3 × 10" — and is read in several places for
 * its set count, so it keeps that shape wherever sets exist. A run has no
 * sets, so it reads "5 km · 30:00" instead, and `parseSetCount` falling back
 * to one is the right answer for it.
 */
export function composeSchemeFor(
  measure: SetMeasure,
  { sets, reps, distanceKm, durationSeconds }: Prescription,
): string {
  const fields = fieldsFor(measure);
  const parts: string[] = [];

  if (fields.sets && fields.reps) {
    parts.push(`${sets} × ${reps}`);
  } else if (fields.sets && fields.duration && !fields.distance) {
    parts.push(`${sets} × ${formatDuration(durationSeconds ?? 0)}`);
  } else if (fields.sets) {
    parts.push(`${sets} ${sets === 1 ? 'set' : 'sets'}`);
  }

  if (fields.distance && distanceKm) parts.push(`${distanceKm} km`);
  if (fields.duration && durationSeconds && !(fields.sets && !fields.reps)) {
    parts.push(formatDuration(durationSeconds));
  }

  // Never empty: a block with nothing prescribed still needs a line, and the
  // old default is what every existing block already says.
  return parts.length > 0 ? parts.join(' · ') : '3 × 10';
}
