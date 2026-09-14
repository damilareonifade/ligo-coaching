import { SHARE_DOMAINS, type ShareDomain } from '@/api/types';

/* ------------------------------------------------------------------ *
 * What each domain actually means, in the client's words.
 *
 * One definition, used three times: the switches at attach time, the
 * switches afterwards on the profile, and the card that appears when a
 * coach asks for one. A client who reads "Injuries, conditions and
 * medication" when granting must read the same sentence when asked —
 * otherwise the app has described the same permission two ways and one
 * of them is the one they will remember.
 * ------------------------------------------------------------------ */

export interface ShareDomainCopy {
  readonly key: ShareDomain;
  readonly title: string;
  readonly body: string;
}

const COPY: Readonly<Record<ShareDomain, ShareDomainCopy>> = {
  workouts: {
    key: 'workouts',
    title: 'Workouts',
    body: 'Programs, sets, and completed sessions.',
  },
  nutrition: {
    key: 'nutrition',
    title: 'Nutrition',
    body: 'Meals and macros you log.',
  },
  metrics: {
    key: 'metrics',
    title: 'Metrics',
    body: 'Weight, measurements, and progress photos.',
  },
  health: {
    key: 'health',
    title: 'Health profile',
    body: 'Injuries, conditions and medication.',
  },
  monthly: {
    key: 'monthly',
    title: 'Monthly check-ins',
    body: 'Your check-in answers and the photos attached to them.',
  },
};

/** Every domain, in the order the switches are shown. */
export const SHARE_DOMAIN_COPY: readonly ShareDomainCopy[] = SHARE_DOMAINS.map(
  (domain) => COPY[domain],
);

export function shareDomainCopy(domain: ShareDomain): ShareDomainCopy {
  return COPY[domain];
}

/**
 * "Sam is asking to see your nutrition."
 *
 * Lower-cased mid-sentence, which is why the title is not simply dropped in:
 * "your Health profile" reads like a proper noun for something that is not one.
 */
export function accessRequestTitle(coachName: string, domain: ShareDomain): string {
  return `${coachName} is asking to see your ${COPY[domain].title.toLowerCase()}`;
}

/**
 * What the client is agreeing to, and what they are not.
 *
 * The second sentence is the important one and is the same on every card: a
 * request is a question, and saying no is a complete answer that costs them
 * nothing.
 */
export function accessRequestBody(domain: ShareDomain): string {
  return `${COPY[domain].body} You can turn it off again at any time, and saying no changes nothing else.`;
}
