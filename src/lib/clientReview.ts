import {
  displayWeight,
  formatLength,
  formatWeight,
  STORED_UNITS,
  type UnitPreference,
} from '@/lib/units';

import type {
  ApiReviewDomain,
  ApiReviewDomainRow,
  ApiSharePermissions,
  DomainAccess,
} from '@/api/types';

/* ------------------------------------------------------------------ *
 * The coach's review of one client.
 *
 * Every rule about what a coach may see is in this file, as a pure
 * function, so it can be held to its word by a test rather than
 * trusted to a component. The screens below call these; they do not
 * re-derive them, and they never branch on `access` themselves.
 * ------------------------------------------------------------------ */

export function isGranted(access: DomainAccess): boolean {
  return access === 'granted';
}

/**
 * The rows a domain card may render — the one choke point between the payload
 * and the screen.
 *
 * It returns nothing at all for a domain that was not granted, rather than
 * blanks or dashes or a greyed-out number. A placeholder in an ungranted
 * domain is worse than an empty card: it tells the coach a value exists and
 * that they are one upgrade away from it, when the truth is that the client
 * said no. And a server that one day sends rows alongside `not-granted` is a
 * bug this function absorbs instead of putting on screen.
 */
export function visibleRows(domain: ApiReviewDomain): readonly ApiReviewDomainRow[] {
  return isGranted(domain.access) ? domain.rows : [];
}

export interface DomainBadge {
  readonly label: string;
  readonly tone: 'violet' | 'neutral';
}

/** "Shared" is a statement about the client's choice, not about the coach's tier. */
export function domainBadge(access: DomainAccess): DomainBadge {
  return isGranted(access)
    ? { label: 'Shared', tone: 'violet' }
    : { label: 'Not shared', tone: 'neutral' };
}

export interface RequestAction {
  readonly title: string;
  readonly disabled: boolean;
}

/**
 * The button under an ungranted domain. Asking is offered once; once asked, it
 * goes flat and says so. There is deliberately no way back to "Request access"
 * from here — a coach who could re-ask on a tap would be able to nag, and the
 * answer to an unanswered request is the client's to give, in their own time.
 *
 * Returns `null` for a granted domain, which has nothing to ask for.
 */
export function requestAction(access: DomainAccess): RequestAction | null {
  switch (access) {
    case 'granted':
      return null;
    case 'requested':
      return { title: 'Requested', disabled: true };
    case 'not-granted':
    default:
      return { title: 'Request access', disabled: false };
  }
}

/** Flip one domain to `requested`, leaving a granted one exactly as it was. */
export function markRequested(
  domains: readonly ApiReviewDomain[],
  domainId: ApiReviewDomain['id'],
): readonly ApiReviewDomain[] {
  return domains.map((domain) =>
    domain.id === domainId && domain.access === 'not-granted'
      ? { ...domain, access: 'requested' as const }
      : domain,
  );
}

/* ------------------------------------------------------------------ *
 * Copy. Quoted from the design and kept verbatim — a promise the app
 * makes about access is the feature, not a label on it, so it lives
 * where a test can hold it to its exact words.
 * ------------------------------------------------------------------ */

/** The violet banner at the top of the review, and nothing more than a fact. */
export function liveBannerText(name: string): string {
  return `${name} is training now`;
}

/**
 * Under the label picker. Labels are the one thing on this screen that is
 * about the coach rather than the client, and the sentence says so before a
 * coach can wonder whether filing someone under "Comp prep" told them anything.
 */
export function labelPrivacyNote(name: string): string {
  // "their", not "her": the design wrote this line about one client, but it
  // renders for every client on the roster.
  return `Labels organise your own roster. ${name} cannot see this, and it changes nothing about their permissions.`;
}

/* ------------------------------------------------------------------ *
 * Session tags.
 * ------------------------------------------------------------------ */

export type SessionTagTone = 'success' | 'violet' | 'danger' | 'neutral';

/** "Done" reads as finished, "Today" as the live thing, "Missed" as a gap. */
export function sessionTagTone(tag: string): SessionTagTone {
  switch (tag) {
    case 'Done':
      return 'success';
    case 'Today':
      return 'violet';
    case 'Missed':
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * The label's own name, for the value on the right of the Label card. "None"
 * rather than an empty string: an unfiled client is a state, not a gap, and
 * the row should read the same whether or not the coach has got to them yet.
 */
export function currentLabelName(
  labelId: string | null,
  labels: readonly { readonly id: string; readonly name: string }[],
): string {
  const match = labels.find((label) => label.id === labelId);
  return match ? match.name : 'None';
}

/* ------------------------------------------------------------------ *
 * Building the domain cards.
 *
 * The titles and both notes were authored inside the mock fixtures,
 * which made them unreachable from the real read — and they are the
 * most carefully worded thing on the screen. A card that says what a
 * coach cannot see, and why, is the feature; moving it here is what
 * lets the live review say the same words.
 * ------------------------------------------------------------------ */

const DOMAIN_TITLES: Record<ApiReviewDomain['id'], string> = {
  nutrition: 'Nutrition',
  metrics: 'Metrics',
  health: 'Health profile',
  monthly: 'Monthly check-ins',
};

/** Order is the coach's reading order, not the permission column's. */
export const REVIEW_DOMAINS: readonly ApiReviewDomain['id'][] = [
  'nutrition',
  'metrics',
  'health',
  'monthly',
];

function grantedNote(id: ApiReviewDomain['id'], name: string): string {
  switch (id) {
    case 'nutrition':
      return `${name} shares nutrition. This can be withdrawn at any time.`;
    case 'metrics':
      return 'Shared with you. Photos are not included.';
    case 'health':
      return 'Shared with you, including injuries, conditions and medication.';
    case 'monthly':
    default:
      return 'Shared with you. This permission includes logging on their behalf.';
  }
}

function withheldNote(id: ApiReviewDomain['id'], name: string): string {
  switch (id) {
    case 'nutrition':
      return `${name} has not shared nutrition. You will not see meals or targets unless they do.`;
    case 'metrics':
      return `${name} has not shared metrics. Body weight and measurements stay private.`;
    case 'health':
      return `${name} has not shared a health profile. You will not see injuries, conditions or medication unless they do.`;
    case 'monthly':
    default:
      return `${name} has not shared check-ins. Check-ins are their own permission, and include logging on their behalf.`;
  }
}

export interface ReviewDomainInput {
  readonly clientName: string;
  readonly permissions: ApiSharePermissions;
  /** Domains this coach has an unanswered request open on. */
  readonly requested: ReadonlySet<ApiReviewDomain['id']>;
  /** What to show inside a granted card. Empty is a fact, not a placeholder. */
  readonly rows?: Partial<Record<ApiReviewDomain['id'], readonly ApiReviewDomainRow[]>>;
}

/**
 * `requested` beats `not-granted` but never beats `granted`: a client who has
 * since shared something should not still be shown as being asked for it.
 */
export function buildReviewDomains({
  clientName,
  permissions,
  requested,
  rows = {},
}: ReviewDomainInput): readonly ApiReviewDomain[] {
  return REVIEW_DOMAINS.map((id) => {
    if (permissions[id]) {
      return {
        id,
        title: DOMAIN_TITLES[id],
        access: 'granted' as const,
        rows: rows[id] ?? [],
        note: grantedNote(id, clientName),
      };
    }

    return {
      id,
      title: DOMAIN_TITLES[id],
      access: requested.has(id) ? ('requested' as const) : ('not-granted' as const),
      // Nothing to put here. The shape has no room for a value the client did
      // not share, which is the point of building it this way.
      rows: [],
      note: withheldNote(id, clientName),
    };
  });
}

/* ------------------------------------------------------------------ *
 * What a shared domain actually shows.
 *
 * A card that says "Shared" and then shows nothing is the permission
 * without the point of it — a coach granted a health profile still
 * cannot see the injury before writing a program. These turn what the
 * client shared into the three or four lines the card has room for.
 * ------------------------------------------------------------------ */

export interface MeasurementReading {
  readonly measured_at: string;
  readonly weight_kg: number | null;
  readonly waist_cm: number | null;
  readonly body_fat_pct: number | null;
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Newest first — latest reading, plus how it has moved since the oldest one. */
export function metricsRows(
  readings: readonly MeasurementReading[],
  units: UnitPreference = STORED_UNITS,
): readonly ApiReviewDomainRow[] {
  const latest = readings[0];
  if (!latest) return [{ label: 'Nothing logged', value: '—' }];

  const rows: ApiReviewDomainRow[] = [];

  if (latest.weight_kg !== null) {
    rows.push({ label: 'Body weight', value: formatWeight(Number(latest.weight_kg), units.weight) });
  }
  if (latest.waist_cm !== null) {
    rows.push({ label: 'Waist', value: formatLength(Number(latest.waist_cm), units.length) });
  }
  if (latest.body_fat_pct !== null) {
    rows.push({ label: 'Body fat', value: `${Number(latest.body_fat_pct)}%` });
  }

  // The trend is the reason a coach reads this at all — one number today says
  // less than the direction it is moving.
  const oldest = [...readings].reverse().find((entry) => entry.weight_kg !== null);
  if (oldest && latest.weight_kg !== null && oldest !== latest) {
    // A difference scales but takes no offset, so converting each end and
    // subtracting gives the same answer either way round.
    const change =
      Math.round(
        (displayWeight(Number(latest.weight_kg), units.weight) -
          displayWeight(Number(oldest.weight_kg), units.weight)) *
          10,
      ) / 10;
    const since = new Date(oldest.measured_at);
    const month = Number.isNaN(since.getTime()) ? '' : ` since ${MONTHS_SHORT[since.getMonth()]}`;
    rows.push({
      label: 'Trend',
      value: `${change < 0 ? '−' : '+'}${Math.abs(change).toFixed(1)} ${units.weight}${month}`,
    });
  }

  return rows.length > 0 ? rows : [{ label: 'Nothing logged', value: '—' }];
}

export interface HealthEntry {
  readonly section: string;
  readonly label: string;
  readonly value: string;
}

/**
 * Injuries first, because they are the ones that change what a coach writes.
 * Bounded, because this is a card and not the client's whole file.
 */
export function healthRows(
  entries: readonly HealthEntry[],
  limit = 5,
): readonly ApiReviewDomainRow[] {
  if (entries.length === 0) return [{ label: 'Nothing recorded', value: '—' }];

  const order = ['injuries', 'conditions', 'medication'];

  return [...entries]
    .sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section))
    .slice(0, limit)
    .map((entry) => ({ label: entry.label, value: entry.value || '—' }));
}

/** The latest check-in: what it said, and what the client wrote about it. */
export function checkInRows(
  entries: readonly {
    readonly label: string;
    readonly weightKg: string;
    readonly delta: string;
    readonly note: string;
  }[],
  units: UnitPreference = STORED_UNITS,
): readonly ApiReviewDomainRow[] {
  const latest = entries[0];
  if (!latest) return [{ label: 'None logged', value: '—' }];

  const rows: ApiReviewDomainRow[] = [
    {
      label: latest.label,
      value:
        latest.weightKg === ''
          ? '—'
          : `${formatWeight(Number(latest.weightKg), units.weight)}${latest.delta === '—' ? '' : ` (${latest.delta})`}`,
    },
  ];

  // Their own words. The most useful line on the card, and the one thing here
  // a coach could not work out from the numbers.
  if (latest.note) rows.push({ label: 'Note', value: latest.note });

  return rows;
}
