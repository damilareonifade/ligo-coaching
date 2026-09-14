/* ------------------------------------------------------------------ *
 * Units.
 *
 * Ligo stores kilograms and centimetres, always. Nothing here changes
 * what is written down — a client on pounds and their coach on kilos
 * are reading one number, and the database has one answer for what a
 * bench press weighed.
 *
 * So every function below is a boundary. `display*` turns what is
 * stored into what this reader sees; `stored*` turns what they typed
 * back into what is kept. A screen that converts on the way out and
 * forgets on the way in is how someone on pounds logs 225 and the
 * database records 225 kilograms.
 * ------------------------------------------------------------------ */

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';

/**
 * What one reader has chosen, as a value.
 *
 * Passed into the pure functions that compose display strings — several API
 * payloads arrive with "82.4 kg" already written, and those need to know. The
 * screens use `useUnits()` instead; this is for the layers below React.
 */
export interface UnitPreference {
  readonly weight: WeightUnit;
  readonly length: LengthUnit;
}

/** Kilograms and centimetres — what is stored, and the fallback everywhere. */
export const STORED_UNITS: UnitPreference = { weight: 'kg', length: 'cm' };

const KG_TO_LB = 2.20462;
const CM_TO_IN = 0.393701;

/* ------------------------------------------------------------------ *
 * Weight
 * ------------------------------------------------------------------ */

export function displayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * KG_TO_LB;
}

export function storedWeight(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / KG_TO_LB;
}

/** Body weight and check-in fields: one decimal is the resolution a scale has. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${round1(displayWeight(kg, unit))} ${unit}`;
}

/** Set chips drop a trailing ".0": 62.5 → "62.5", 60 → "60". No unit — the column head carries it. */
export function formatSetWeight(kg: number, unit: WeightUnit): string {
  const value = round1(displayWeight(kg, unit));
  return Number.isInteger(value) ? String(value) : String(value);
}

/** Session volume, where a decimal is noise: "4,320 kg". */
export function formatVolume(kg: number, unit: WeightUnit): string {
  return `${Math.round(displayWeight(kg, unit)).toLocaleString('en-US')} ${unit}`;
}

/**
 * How much one tap of the stepper moves.
 *
 * 2.5 kg is the smallest pair of plates on most bars; 5 lb is the same idea in
 * a gym that stocks pounds. Deliberately not 2.5 kg converted — 5.51 lb is a
 * number nobody has ever loaded onto a bar.
 */
export function weightStep(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5;
}

/* ------------------------------------------------------------------ *
 * Length
 * ------------------------------------------------------------------ */

export function displayLength(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cm * CM_TO_IN;
}

export function storedLength(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value / CM_TO_IN;
}

export function formatLength(cm: number, unit: LengthUnit): string {
  return `${round1(displayLength(cm, unit))} ${unit}`;
}

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

/**
 * One decimal, and no trailing zero.
 *
 * Converting invents precision that was never measured — 84 kg is 185.1889…
 * lb — and a body-weight card reading "185.18884 lb" says the scale is more
 * exact than it is.
 */
function round1(value: number): number {
  return Number(value.toFixed(1));
}

/** "kg · cm" — the value on the Units row, and the summary on the picker. */
export function unitsSummary(weight: WeightUnit, length: LengthUnit): string {
  return `${weight} · ${length}`;
}
