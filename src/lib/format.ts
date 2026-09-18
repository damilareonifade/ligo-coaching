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

/**
 * "just now" / "4 minutes ago" / "3 days ago" — for a device list, where the
 * interesting part is how stale a row is, not the wall-clock time it was
 * written. Falls back to a date once "days ago" stops being useful.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';

  const seconds = Math.round((now.getTime() - then) / 1000);
  // A clock skewed slightly ahead of the server should not read "in 3 seconds".
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(then).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "Tuesday, 16 June" — the eyebrow on a screen that is about today. */
export function formatToday(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * "Good morning" / "Good afternoon" / "Good evening".
 *
 * The device's clock, not the server's: this greets the person holding the
 * phone, and they are the authority on what time it is where they are.
 */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Maya" from "Maya Andersson" — a greeting uses the name people answer to. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * The stamp beside a message: "09:12" today, "Mon 09:12" this week, "4 Mar"
 * before that.
 *
 * Three shapes rather than one, because a thread is read from the bottom and
 * the question changes as you scroll up it. At the foot it is "how long ago",
 * where a weekday is noise; a screen higher it is "which day", where the clock
 * is; further back neither matters and the date is the only useful answer.
 */
export function formatChatStamp(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);

  if (days === 0) return formatTime(iso);
  // Six, not seven: at seven days "Mon" is this Monday or last Monday and the
  // reader cannot tell which.
  if (days > 0 && days < 7) {
    return `${then.toLocaleDateString(undefined, { weekday: 'short' })} ${formatTime(iso)}`;
  }

  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
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

// Weight and length formatting lives in src/lib/units.ts, which is the one
// place that knows what the reader has chosen. Two opinions about how to draw
// a kilogram is how one screen ends up in pounds and the next does not.
