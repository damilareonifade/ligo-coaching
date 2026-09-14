import type { ApiCoachNotification } from '@/api/types';

/* ------------------------------------------------------------------ *
 * The coach's own settings.
 * ------------------------------------------------------------------ */

/**
 * "Strength coach · Berlin · 17 clients".
 *
 * The count is passed in from the roster rather than written into a fixture,
 * so the headline cannot outlive the roster it describes — a coach who loses a
 * client should not read a number that says otherwise on the next screen.
 */
export function coachHeadline(prefix: string, clientCount: number): string {
  return `${prefix} · ${clientCount} client${clientCount === 1 ? '' : 's'}`;
}

/* ------------------------------------------------------------------ *
 * Notification locks.
 *
 * One predicate, read by the switch and by the mutation both. A rule
 * enforced only where it is drawn is a rule that holds until someone
 * calls the mutation from somewhere else.
 * ------------------------------------------------------------------ */

export function canToggleNotification(row: ApiCoachNotification): boolean {
  return !row.locked;
}

/**
 * Apply a toggle to the list, refusing a locked row.
 *
 * Refusing here means the optimistic update, the mock "server" and the switch
 * all reach the same answer through the same function, so there is no order of
 * events in which the knob moves and the state does not follow — or the state
 * moves and the knob does not.
 */
export function toggleNotification(
  rows: readonly ApiCoachNotification[],
  id: string,
  enabled: boolean,
): readonly ApiCoachNotification[] {
  return rows.map((row) =>
    row.id === id && canToggleNotification(row) ? { ...row, enabled } : row,
  );
}

/* ------------------------------------------------------------------ *
 * Copy, verbatim.
 * ------------------------------------------------------------------ */

/** Under the notification switches, explaining the one that will not move. */
export const NOTIFICATION_LOCK_NOTE =
  'Permission changes cannot be muted they change what you are allowed to do.';

/**
 * The last line on the coach's settings screen. It is here rather than in a
 * component because it is the app's answer to "what is mine?" — a coach's
 * export stops at their own work, and a client's logs leave with the client.
 */
export const COACH_EXPORT_NOTE =
  'Your export contains your programs and notes. Client logs belong to clients and leave with them.';
