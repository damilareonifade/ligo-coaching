import { SHARE_DOMAINS } from '@/api/types';
import type {
  ApiRosterClient,
  ApiSharePermissions,
  ApiRosterLabel,
  RosterAccess,
  RosterAttention,
} from '@/api/types';

/* ------------------------------------------------------------------ *
 * Derivations. The roster is the source of truth for its own counts —
 * a hardcoded stat or label count goes stale the moment a label is
 * deleted, and the coach is left reading a number that is not true.
 * ------------------------------------------------------------------ */

/** Label counts always come from the clients, never from the stored label. */
export function withLabelCounts(
  labels: readonly ApiRosterLabel[],
  clients: readonly ApiRosterClient[],
): readonly ApiRosterLabel[] {
  return labels.map((label) => ({
    ...label,
    count: clients.filter((client) => client.labelId === label.id).length,
  }));
}

/**
 * How many clients sit behind each filter.
 *
 * This replaced a row of KPI tiles that sat above the filter chips and set the
 * same state they did — the same control twice, one of them taking ninety
 * pixels to say a number the chip beside it could carry. The counts live on
 * the chips now, so there is one place to tap and one place to read.
 */
export function attentionCounts(
  clients: readonly ApiRosterClient[],
): Readonly<Record<RosterAttentionFilter, number>> {
  return {
    all: clients.length,
    review: clients.filter((client) => client.attention === 'review').length,
    live: clients.filter((client) => client.attention === 'live').length,
    new: clients.filter((client) => client.attention === 'new').length,
    quiet: clients.filter((client) => client.attention === 'quiet').length,
  };
}

/* ------------------------------------------------------------------ *
 * Deriving a roster card.
 *
 * Both of these used to be typed into fixtures by hand, so there was
 * no rule to disagree with. They are here rather than in the API
 * module because they are the rule, and a coach reading "Needs a look"
 * deserves it to mean the same thing every time.
 * ------------------------------------------------------------------ */

/** A workout finished this recently is the one a coach has not seen yet. */
const REVIEW_WINDOW_HOURS = 48;
/** Past this without training, a client has gone quiet rather than paused. */
const QUIET_AFTER_DAYS = 14;
/** How long someone counts as newly attached. */
const NEW_FOR_DAYS = 7;

export interface RosterActivity {
  readonly isTraining: boolean;
  readonly lastWorkoutAt: string | null;
  readonly acceptedAt: string | null;
}

/**
 * What, if anything, this client needs from the coach.
 *
 * Order is the whole design: training now beats everything, then somebody
 * brand new who has not started, then a session worth looking at, then a
 * silence worth noticing. `ok` is what is left, and is the answer most of
 * the roster should give most of the time.
 */
export function deriveAttention(
  activity: RosterActivity,
  now: Date = new Date(),
): RosterAttention {
  if (activity.isTraining) return 'live';

  const last = activity.lastWorkoutAt ? Date.parse(activity.lastWorkoutAt) : null;
  const hoursSince = last === null ? null : (now.getTime() - last) / 3_600_000;

  if (last === null) {
    // Never trained. Recently attached is "new"; a while ago is "quiet",
    // which is a different conversation.
    const accepted = activity.acceptedAt ? Date.parse(activity.acceptedAt) : null;
    if (accepted !== null && (now.getTime() - accepted) / 86_400_000 <= NEW_FOR_DAYS) {
      return 'new';
    }
    return 'quiet';
  }

  if (hoursSince !== null && hoursSince <= REVIEW_WINDOW_HOURS) return 'review';
  if (hoursSince !== null && hoursSince >= QUIET_AFTER_DAYS * 24) return 'quiet';
  return 'ok';
}

/**
 * How much of themselves the client has shared, as one word.
 *
 * A summary of the five permission switches, and deliberately coarse: the
 * roster row is a glance, and the exact list belongs on the client's own card
 * where it can be read properly.
 */
export function deriveAccess(permissions: ApiSharePermissions): RosterAccess {
  const granted = SHARE_DOMAINS.filter((domain) => permissions[domain]).length;
  if (granted === 0) return 'none';
  if (granted === 1) return 'min';
  if (granted >= SHARE_DOMAINS.length) return 'full';
  return 'partial';
}

/** "Upper/Lower · workouts, nutrition", or just what they share. */
export function rosterMeta(
  programName: string | null,
  permissions: ApiSharePermissions,
): string {
  const shared = SHARE_DOMAINS.filter((domain) => permissions[domain]);
  // No week number: a program is a rotation the client works through at their
  // own pace, so there is no week N to be in. See src/lib/rotation.ts.
  const parts = programName ? [programName] : ['No program yet'];
  parts.push(shared.length > 0 ? shared.join(', ') : 'nothing shared');
  return parts.join(' · ');
}

/* ------------------------------------------------------------------ *
 * Access. What the client shares, said plainly. `none` is not an
 * absence to be glossed over — it is a boundary, so it gets words.
 * ------------------------------------------------------------------ */

export const accessLabel: Record<RosterAccess, string> = {
  full: 'Full access',
  partial: 'Partial',
  min: 'Minimal',
  none: 'Messaging only',
};

/* ------------------------------------------------------------------ *
 * Filtering, sorting, grouping — all local to the roster screen, all
 * pure, so the screen holds nothing but the three inputs a coach set.
 * ------------------------------------------------------------------ */

export type RosterSort = 'recent' | 'az' | 'attention' | 'label';

/** Tapping the sort button walks this ring, in this order. */
export const ROSTER_SORTS: readonly RosterSort[] = ['recent', 'az', 'attention', 'label'];

export const rosterSortLabel: Record<RosterSort, string> = {
  recent: 'Recent',
  az: 'A–Z',
  attention: 'Attention',
  label: 'By label',
};

export function nextRosterSort(current: RosterSort): RosterSort {
  const index = ROSTER_SORTS.indexOf(current);
  return ROSTER_SORTS[(index + 1) % ROSTER_SORTS.length];
}

/** `all` plus the four states worth singling out — `ok` is the quiet majority. */
export type RosterAttentionFilter = 'all' | Exclude<RosterAttention, 'ok'>;

export interface RosterFilters {
  readonly query: string;
  readonly attention: RosterAttentionFilter;
  /** `null` means "all labels", not "unlabelled". */
  readonly labelId: string | null;
}

export function filterRosterClients(
  clients: readonly ApiRosterClient[],
  { query, attention, labelId }: RosterFilters,
): readonly ApiRosterClient[] {
  const needle = query.trim().toLowerCase();

  return clients.filter((client) => {
    if (attention !== 'all' && client.attention !== attention) return false;
    if (labelId !== null && client.labelId !== labelId) return false;
    if (needle.length === 0) return true;
    // The program lives in `meta`, and the placeholder promises to search it.
    return (
      client.name.toLowerCase().includes(needle) || client.meta.toLowerCase().includes(needle)
    );
  });
}

const attentionRank: Record<RosterAttention, number> = {
  live: 0,
  review: 1,
  new: 2,
  ok: 3,
  quiet: 4,
};

export function sortRosterClients(
  clients: readonly ApiRosterClient[],
  sort: RosterSort,
): readonly ApiRosterClient[] {
  const sorted = [...clients];

  switch (sort) {
    case 'az':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'attention':
      return sorted.sort(
        (a, b) => attentionRank[a.attention] - attentionRank[b.attention] || a.daysAgo - b.daysAgo,
      );
    // "By label" orders inside each label group; the grouping does the rest.
    case 'label':
      return sorted.sort((a, b) => a.daysAgo - b.daysAgo);
    case 'recent':
    default:
      return sorted.sort((a, b) => a.daysAgo - b.daysAgo);
  }
}

export interface RosterGroup {
  readonly id: string;
  readonly title: string;
  readonly clients: readonly ApiRosterClient[];
}

/** Recency buckets. A coach reads the roster by "when did I last see them". */
function groupByRecency(clients: readonly ApiRosterClient[]): readonly RosterGroup[] {
  const buckets = [
    { id: 'today', title: 'TODAY', match: (days: number) => days === 0 },
    { id: 'week', title: 'THIS WEEK', match: (days: number) => days >= 1 && days < 7 },
    { id: 'quiet', title: 'QUIET', match: (days: number) => days >= 7 },
  ] as const;

  return buckets
    .map((bucket) => ({
      id: bucket.id,
      title: bucket.title,
      clients: clients.filter((client) => bucket.match(client.daysAgo)),
    }))
    .filter((group) => group.clients.length > 0);
}

/** Under "By label", the coach's own filing replaces the calendar. */
function groupByLabel(
  clients: readonly ApiRosterClient[],
  labels: readonly ApiRosterLabel[],
): readonly RosterGroup[] {
  const labelled = labels.map((label) => ({
    id: label.id,
    title: label.name.toUpperCase(),
    clients: clients.filter((client) => client.labelId === label.id),
  }));

  const known = new Set(labels.map((label) => label.id));
  const rest = clients.filter((client) => client.labelId === null || !known.has(client.labelId));

  return [...labelled, { id: 'unlabelled', title: 'NO LABEL', clients: rest }].filter(
    (group) => group.clients.length > 0,
  );
}

export function groupRosterClients(
  clients: readonly ApiRosterClient[],
  sort: RosterSort,
  labels: readonly ApiRosterLabel[],
): readonly RosterGroup[] {
  return sort === 'label' ? groupByLabel(clients, labels) : groupByRecency(clients);
}
