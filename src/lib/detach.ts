/* ------------------------------------------------------------------ *
 * Detaching a coach.
 *
 * The other side of every permission screen in the app. A client who
 * wants out should get one sheet, one tap, and no negotiation — so
 * this file holds what the sheet promises, and the promises are
 * specific enough to be checked rather than reassuring enough to be
 * ignored. "You keep everything" is a claim about four separate
 * things, so it is made as four rows.
 * ------------------------------------------------------------------ */

export interface DetachConsequence {
  readonly id: 'access' | 'data' | 'programs' | 'thread';
  readonly title: string;
  readonly body: string;
}

/**
 * In the order a leaving client asks them. The first is what they came for;
 * the next two are the fears that stop people leaving at all — that going
 * costs them their history, or the plan they are mid-way through — and the
 * last is the one nobody thinks to ask until the thread is gone.
 */
export const DETACH_CONSEQUENCES: readonly DetachConsequence[] = [
  {
    id: 'access',
    title: 'Access ends immediately',
    body: 'Workouts, nutrition and metrics stop being visible.',
  },
  {
    id: 'data',
    title: 'Your data stays yours',
    body: 'Sessions, meals, measurements and photos are untouched.',
  },
  {
    id: 'programs',
    title: 'Programs remain',
    body: 'Anything published to you is still yours to follow.',
  },
  {
    id: 'thread',
    title: 'The thread closes',
    body: 'History stays readable, but nothing new can be sent.',
  },
];

export function detachTitle(coachName: string): string {
  return `Detach from ${coachName}?`;
}

/**
 * The two sentences under the title. The first is the whole mechanism —
 * immediate, and total — and the second is there because the first is the
 * reason people hesitate.
 */
export function detachBody(coachName: string): string {
  return `${coachName} loses all access the moment you confirm. You keep everything.`;
}

/** Named for what it protects, not for what it ends. */
export const DETACH_CONFIRM_TITLE = 'Detach and keep my data';

export const DETACH_DISMISS_TITLE = 'Stay attached';
