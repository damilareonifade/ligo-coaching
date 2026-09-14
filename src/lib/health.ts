import type { ApiHealthRow, ApiHealthSection } from '@/api/types';

/* ------------------------------------------------------------------ *
 * The health profile's three sections.
 *
 * Headings and the notes under them are copy, not data — composed here
 * so a wording change is an edit rather than a migration, and so the
 * sections render in the same order and with the same words whether
 * the client has entered anything or not.
 * ------------------------------------------------------------------ */

export const HEALTH_SECTIONS = ['injuries', 'conditions', 'medication'] as const;

export type HealthSection = (typeof HEALTH_SECTIONS)[number];

interface SectionCopy {
  readonly title: string;
  readonly note: string;
  /** What the add form suggests, so an empty section is not a blank page. */
  readonly labelHint: string;
  readonly valueHint: string;
}

const COPY: Readonly<Record<HealthSection, SectionCopy>> = {
  injuries: {
    title: 'INJURIES & LIMITATIONS',
    note: 'Shown to a coach before they write you a program.',
    labelHint: 'Left shoulder',
    valueHint: 'Impingement, cleared Feb 2026',
  },
  conditions: {
    title: 'CONDITIONS',
    note: 'Only what you enter. Ligo never infers a condition.',
    labelHint: 'Asthma',
    valueHint: 'Exercise-induced, inhaler pre-session',
  },
  medication: {
    title: 'MEDICATION & ALLERGIES',
    note: 'Kept for your own record. A coach sees it only with health sharing on.',
    labelHint: 'Salbutamol',
    valueHint: 'As needed',
  },
};

export function healthSectionCopy(section: HealthSection): SectionCopy {
  return COPY[section];
}

/** Only an injury carries one — a status on a prescription means nothing. */
export const INJURY_STATUSES = ['Active', 'Watch', 'Resolved'] as const;

export type InjuryStatus = (typeof INJURY_STATUSES)[number];

export function supportsStatus(section: HealthSection): boolean {
  return section === 'injuries';
}

/**
 * All three sections, always — an empty one says what it is for rather than
 * disappearing, because "no injuries recorded" is information a coach reading
 * this needs and a blank space is not.
 */
export function buildHealthSections(
  rows: readonly (ApiHealthRow & { readonly section: HealthSection })[],
): readonly ApiHealthSection[] {
  return HEALTH_SECTIONS.map((section) => ({
    id: section,
    ...COPY[section],
    rows: rows.filter((row) => row.section === section),
  }));
}

/**
 * What the switch says, in the client's own terms.
 *
 * The promise is exact and load-bearing: turning it off hides it and deletes
 * nothing. The database keeps that promise — `health_entries` is filtered by
 * the permission, never removed with it.
 */
export function healthShareNote(coachName: string | null, shared: boolean): string {
  if (!coachName) {
    return 'No coach attached. Nothing here is shared with anyone.';
  }
  const first = coachName.split(' ')[0];
  return shared
    ? `${first} can see your health profile. Turn this off and it is hidden immediately — nothing is deleted.`
    : `${first} cannot see your health profile. Turn this on and they see it until you turn it off again.`;
}
