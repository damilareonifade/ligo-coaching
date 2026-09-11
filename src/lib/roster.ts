import type {
  ApiRosterClient,
  ApiRosterLabel,
  ApiRosterStat,
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

export function deriveRosterStats(clients: readonly ApiRosterClient[]): readonly ApiRosterStat[] {
  return [
    { id: 'clients', label: 'Clients', value: `${clients.length}` },
    {
      id: 'review',
      label: 'Need a look',
      value: `${clients.filter((client) => client.attention === 'review').length}`,
    },
    {
      id: 'live',
      label: 'Training now',
      value: `${clients.filter((client) => client.attention === 'live').length}`,
    },
  ];
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
