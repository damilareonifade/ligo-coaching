import type { ApiCheckIn, ApiCheckInCell, ApiCheckInStat } from '@/api/types';
import {
  displayLength,
  displayWeight,
  formatWeight,
  STORED_UNITS,
  type UnitPreference,
} from '@/lib/units';

/* ------------------------------------------------------------------ *
 * Turning measurement rows into the cards a client reads.
 *
 * A check-in is a `body_measurements` row — the label, the delta and
 * the "logged by" line are all derived. They live here rather than in
 * the API module so the row that appears the instant somebody saves is
 * composed the same way as the one the refetch hands back, instead of
 * visibly rewriting itself a beat later.
 * ------------------------------------------------------------------ */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** "3 Aug", the day part of a "Logged by" line. */
export function dayLabel(date: Date): string {
  return Number.isNaN(date.getTime())
    ? ''
    : `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function monthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function measurementCell(
  label: string,
  value: number | string | null,
  unit: string,
): ApiCheckInCell {
  const text = typeof value === 'string' ? value.trim() : value;
  if (text === null || text === '') return { label, value: '—' };
  return { label, value: `${Number(text)}${unit}` };
}

/**
 * A drop is the signed change against the month below it, using U+2212 to
 * match the rest of the app — a hyphen reads as punctuation next to a number.
 */
export function formatDelta(weightKg: number | null, previousKg: number | null): string {
  if (weightKg === null || previousKg === null) return '—';
  const change = Math.round((weightKg - previousKg) * 10) / 10;
  if (change === 0) return '0.0';
  return change < 0 ? `−${Math.abs(change).toFixed(1)}` : `+${change.toFixed(1)}`;
}

export interface CheckInRow {
  readonly id: string;
  readonly month_start: string;
  readonly measured_at: string;
  readonly weight_kg: number | null;
  readonly waist_cm: number | null;
  readonly chest_cm: number | null;
  readonly hips_cm: number | null;
  readonly body_fat_pct: number | null;
  readonly note: string | null;
  readonly logged_by_client: boolean;
}

/**
 * `previous` is the month below, which is the next row down — they run newest
 * first.
 *
 * `units` decides only how the cells read; `weightKg` stays the stored
 * kilograms, because the edit form converts it itself and a value that had
 * already been converted would be converted twice.
 */
export function checkInFromRow(
  row: CheckInRow,
  previous: CheckInRow | null,
  units: UnitPreference = STORED_UNITS,
): ApiCheckIn {
  const convert = (cm: number | null): number | null =>
    cm === null ? null : Number(displayLength(Number(cm), units.length).toFixed(1));
  const measured = new Date(row.measured_at);
  const by = row.logged_by_client ? 'you' : 'coach';
  const stamp = dayLabel(measured);
  const day = stamp === '' ? '' : ` · ${stamp}`;

  return {
    id: row.id,
    label: monthLabel(row.month_start),
    weightKg: row.weight_kg === null ? '' : String(Number(row.weight_kg)),
    delta: formatDelta(
      row.weight_kg === null ? null : Number(row.weight_kg),
      previous?.weight_kg == null ? null : Number(previous.weight_kg),
    ),
    cells: [
      measurementCell('Waist', convert(row.waist_cm), ` ${units.length}`),
      measurementCell('Chest', convert(row.chest_cm), ` ${units.length}`),
      measurementCell('Hips', convert(row.hips_cm), ` ${units.length}`),
      measurementCell('Body fat', row.body_fat_pct, '%'),
    ],
    note: row.note ?? '',
    by,
    byLine: `Logged by ${by === 'you' ? 'you' : 'your coach'}${day}`,
    // Nothing stores a photo yet — no bucket, no upload. Zero is the honest
    // count, not a placeholder.
    photos: 0,
  };
}

/** Latest weight, the change across the window, and how many months are logged. */
export function checkInStats(
  entries: readonly ApiCheckIn[],
  units: UnitPreference = STORED_UNITS,
): readonly ApiCheckInStat[] {
  const weights = entries
    .map((entry) => Number(entry.weightKg))
    .filter((value) => Number.isFinite(value));

  const latest = weights[0];
  const oldest = weights[weights.length - 1];
  const since = entries[entries.length - 1]?.label.split(' ')[0] ?? '';

  return [
    {
      label: 'Latest weight',
      value: latest === undefined ? '—' : formatWeight(latest, units.weight),
    },
    {
      label: since ? `Since ${since}` : 'Change',
      // A change is a difference, so it scales but never takes an offset —
      // converting the two weights and subtracting gives the same answer.
      value:
        weights.length < 2
          ? '—'
          : `${formatDelta(displayWeight(latest, units.weight), displayWeight(oldest, units.weight))} ${units.weight}`,
    },
    { label: 'Logged', value: `${entries.length}` },
  ];
}

/**
 * What the toggle actually controls, said exactly.
 *
 * Seeing and logging are two permissions, and the copy used to describe one
 * switch doing both. `monthly` is what this screen sets; writing on somebody's
 * behalf is `log_for`, set on the permissions screen — so the note says which
 * is which rather than implying a single lever.
 */
export function checkInShareNote(
  coachName: string | null,
  shared: boolean,
  canLog: boolean,
): string {
  if (!coachName) {
    return 'No coach attached. Nothing here is shared with anyone.';
  }

  const first = coachName.split(' ')[0];
  if (!shared) {
    return `${first} cannot see your check-ins. Turn this on and they can, until you turn it off again — nothing is ever deleted.`;
  }

  return canLog
    ? `${first} can see your check-ins, and can log one for you — entries they add say so. Turning this off hides them immediately; nothing is deleted.`
    : `${first} can see your check-ins. Logging one for you is a separate permission you have not given. Turning this off hides them immediately; nothing is deleted.`;
}
