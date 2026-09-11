import type { ApiReviewDomain, ApiReviewDomainRow, DomainAccess } from '@/api/types';

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
