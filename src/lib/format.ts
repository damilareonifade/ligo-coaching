export type WeightUnit = 'kg' | 'lb';

const KG_TO_LB = 2.20462;

export function formatWeight(kg: number, unit: WeightUnit = 'kg'): string {
  const value = unit === 'kg' ? kg : kg * KG_TO_LB;
  return `${Math.round(value)}${unit}`;
}

/** "Today" / "Tomorrow" / "Mon 4 Mar" — coaches scan by day, not by timestamp. */
export function formatSessionDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Tomorrow';
  if (dayDiff === -1) return 'Yesterday';

  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Avatar fallback: "Ada Lovelace" → "AL". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Workout clock: "07:42", and "1:07:42" once past the hour. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (n: number): string => String(n).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Session volume: "4,320 kg". */
export function formatVolumeKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('en-US')} kg`;
}

/** Set chip weights drop the trailing ".0": 62.5 → "62.5", 60 → "60". */
export function formatSetWeight(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : String(Number(kg.toFixed(1)));
}
