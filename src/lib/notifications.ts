import type {
  ApiNotificationDestination,
  ApiNotificationGroup,
  NotificationKind,
} from '@/api/types';

/* ------------------------------------------------------------------ *
 * The notification feed — one on each side of the app.
 *
 * Two things happen in here that a reader must be able to tell apart
 * at a glance: work (a session, a check-in, a reply) and access
 * (somebody giving, asking for, or taking back what another can see).
 * Everything below exists to keep that line visible.
 * ------------------------------------------------------------------ */

/**
 * The six kinds that turn on what somebody can see. Attaching and detaching
 * belong here as much as granting and revoking do — a detach takes back
 * everything at once, which is the largest access change there is — and a
 * request belongs because being asked is the moment a client decides.
 */
const ACCESS_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  'access-requested',
  'access-granted',
  'access-revoked',
  'access-declined',
  'attached',
  'detached',
]);

export function isAccessChange(kind: NotificationKind): boolean {
  return ACCESS_KINDS.has(kind);
}

/**
 * Granting and revoking are both access changes and must both stand out, but
 * they are not the same news — this is what separates them *inside* the access
 * treatment, so a revoke never reads as a grant at a glance.
 */
export function isAccessLoss(kind: NotificationKind): boolean {
  return kind === 'access-revoked' || kind === 'detached';
}

/**
 * Marking one read, rebuilt rather than mutated.
 *
 * The optimistic mutation, the mock's own state and any future server echo all
 * go through here, so a row that turns read under the thumb turns read the
 * same way when the refetch lands. Groups with no match come back by
 * reference, so FlashList does not re-render rows nothing happened to.
 */
export function markNotificationRead(
  groups: readonly ApiNotificationGroup[],
  id: string,
): readonly ApiNotificationGroup[] {
  return groups.map((group) =>
    group.items.some((item) => item.id === id)
      ? {
          ...group,
          items: group.items.map((item) => (item.id === id ? { ...item, unread: false } : item)),
        }
      : group,
  );
}

export function unreadCount(groups: readonly ApiNotificationGroup[]): number {
  return groups.reduce(
    (total, group) => total + group.items.filter((item) => item.unread).length,
    0,
  );
}

/** Whether the bell should carry a dot. */
export function hasUnread(groups: readonly ApiNotificationGroup[]): boolean {
  return groups.some((group) => group.items.some((item) => item.unread));
}

/* ------------------------------------------------------------------ *
 * Where a row goes, and whether to believe it.
 *
 * Destinations are composed by the server and arrive as JSON, which
 * makes them the one part of a notification the device must not take
 * on faith. A row that cannot be vouched for is not a crash and not a
 * dead tap — it simply has nowhere to go, and stops looking like it
 * does.
 * ------------------------------------------------------------------ */

/**
 * An in-app path, as Expo Router understands one.
 *
 * Shape only: one leading slash, no scheme, no protocol-relative `//host`,
 * no whitespace or control characters. Deliberately not a list of every route
 * in the app — that list would have to be kept in step with the file tree, and
 * a path that no longer exists lands on `+not-found`, which is a screen we
 * have and a reasonable place to land. What this stops is the thing that is
 * not a path at all.
 */
function isScreenRoute(value: string): boolean {
  return /^\/(?!\/)[\w\-./[\]@%?&=+~:,!$'()*;]*$/.test(value) && !value.includes('..');
}

/**
 * `https:` and nothing else.
 *
 * `javascript:` and `data:` are the reason this function exists — either one
 * reaching `Linking.openURL` or an in-app browser is arbitrary code from
 * whatever wrote the row. `http:` is refused too: there is no page worth
 * opening for someone in plaintext, and allowing it means the check is about
 * taste rather than safety.
 */
function isSafeUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseDestination(raw: unknown): ApiNotificationDestination | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;

  if (candidate.kind === 'screen') {
    const route = candidate.route;
    return typeof route === 'string' && isScreenRoute(route) ? { kind: 'screen', route } : null;
  }

  if (candidate.kind === 'web' || candidate.kind === 'external') {
    const url = candidate.url;
    return typeof url === 'string' && isSafeUrl(url)
      ? { kind: candidate.kind, url }
      : null;
  }

  return null;
}
