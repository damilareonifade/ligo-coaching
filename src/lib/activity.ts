import type { ActivityKind, ApiActivityGroup } from '@/api/types';

/* ------------------------------------------------------------------ *
 * The activity feed. Two things happen in here that a coach must be
 * able to tell apart at a glance: work (a session, a check-in, a
 * reply) and access (a client giving or taking back what he can see).
 * Everything below exists to keep that line visible.
 * ------------------------------------------------------------------ */

/**
 * The four kinds that change what the coach can see. Attaching and detaching
 * belong here as much as granting and revoking do — a detach takes back
 * everything at once, which is the largest access change there is.
 */
const ACCESS_KINDS: ReadonlySet<ActivityKind> = new Set<ActivityKind>([
  'permission-granted',
  'permission-revoked',
  'attached',
  'detached',
]);

export function isAccessChange(kind: ActivityKind): boolean {
  return ACCESS_KINDS.has(kind);
}

/**
 * Granting and revoking are both access changes and must both stand out, but
 * they are not the same news — this is what separates them *inside* the access
 * treatment, so a revoke never reads as a grant at a glance.
 */
export function isAccessLoss(kind: ActivityKind): boolean {
  return kind === 'permission-revoked' || kind === 'detached';
}

/**
 * Marking one item read, rebuilt rather than mutated. The optimistic mutation
 * and any future server echo both go through here, so a row that turns read
 * under the thumb turns read the same way when the refetch lands.
 */
export function markActivityRead(
  groups: readonly ApiActivityGroup[],
  itemId: string,
): readonly ApiActivityGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => (item.id === itemId ? { ...item, unread: false } : item)),
  }));
}

export function unreadActivityCount(groups: readonly ApiActivityGroup[]): number {
  return groups.reduce(
    (total, group) => total + group.items.filter((item) => item.unread).length,
    0,
  );
}
