import type {
  ApiExerciseOption,
  ApiProgramBlock,
  ApiProgramDay,
  ProgramStatus,
} from '@/api/types';

/* ------------------------------------------------------------------ *
 * Set maths. The scheme is authored as display text ("4 × 8") because
 * that is what the coach types and what the client reads — so the set
 * count is derived from it rather than stored twice and left to drift.
 * ------------------------------------------------------------------ */

/** Leading integer of a scheme. Anything unparseable counts as no sets. */
export function parseSetCount(scheme: string): number {
  const match = /^\s*(\d+)/.exec(scheme);
  if (!match) return 0;
  const count = Number(match[1]);
  return Number.isFinite(count) ? count : 0;
}

export function totalSets(blocks: readonly ApiProgramBlock[]): number {
  return blocks.reduce((sum, block) => sum + parseSetCount(block.scheme), 0);
}

/** Header total for a day, e.g. "14 sets". Empty days say so in words. */
export function setsLabel(blocks: readonly ApiProgramBlock[]): string {
  const count = totalSets(blocks);
  if (count === 0) return 'No sets yet';
  return `${count} ${count === 1 ? 'set' : 'sets'}`;
}

/* ------------------------------------------------------------------ *
 * Assignment. Zero is not "Assigned to 0 clients" — a program nobody
 * holds is unassigned, and the card should say that plainly.
 * ------------------------------------------------------------------ */

export function assignedLabel(count: number): string {
  if (count <= 0) return 'Not assigned';
  return `Assigned to ${count} ${count === 1 ? 'client' : 'clients'}`;
}

/** Badge tone per status. Archived is deliberately quiet, not alarming. */
export function statusTone(status: ProgramStatus): 'violet' | 'warning' | 'neutral' {
  switch (status) {
    case 'published':
      return 'violet';
    case 'draft':
      return 'warning';
    case 'archived':
    default:
      return 'neutral';
  }
}

/* ------------------------------------------------------------------ *
 * Builder shapes.
 * ------------------------------------------------------------------ */

/** Day labels for a freshly chosen day count — "Day 1" … "Day n". */
export function buildDayLabels(dayCount: number): readonly string[] {
  return Array.from({ length: Math.max(0, dayCount) }, (_, index) => `Day ${index + 1}`);
}

/**
 * Growing or shrinking the day count keeps the days already filled in —
 * dropping from 5 to 4 and back must not silently empty day 5's blocks.
 */
export function resizeDays(
  days: readonly ApiProgramDay[],
  dayCount: number,
): readonly ApiProgramDay[] {
  const labels = buildDayLabels(dayCount);
  return labels.map(
    (label, index) => days[index] ?? { id: `day-${index + 1}`, label, blocks: [] },
  );
}

/**
 * A block starts at three sets of ten because that is the scheme a coach edits
 * away from, not one they have to invent — and the RPE stays blank rather than
 * putting a number on the client's bar that nobody chose.
 */
export const DEFAULT_SCHEME = '3 × 10';

let blockSeq = 0;

export function newBlock(name: string): ApiProgramBlock {
  blockSeq += 1;
  return {
    id: `blk-${Date.now()}-${blockSeq}`,
    name: name.trim(),
    scheme: DEFAULT_SCHEME,
    rpe: '',
    note: null,
  };
}

/* ------------------------------------------------------------------ *
 * Exercise picker. The mock searches with exactly this function, so the
 * list a coach sees offline is the list the endpoint would return.
 * ------------------------------------------------------------------ */

/** `all` plus the tag filters, plus `recent` which is a section, not a tag. */
export type ExerciseFilter = 'all' | 'compound' | 'accessory' | 'yours' | 'recent';

export function filterExerciseOptions(
  options: readonly ApiExerciseOption[],
  query: string,
  filter: string,
): readonly ApiExerciseOption[] {
  const needle = query.trim().toLowerCase();

  return options.filter((option) => {
    if (filter === 'recent' && option.group !== 'Recent') return false;
    if (
      (filter === 'compound' || filter === 'accessory' || filter === 'yours') &&
      option.tag.toLowerCase() !== filter
    ) {
      return false;
    }
    if (needle.length === 0) return true;
    // The placeholder promises equipment and muscle are searchable too.
    return (
      option.name.toLowerCase().includes(needle) || option.meta.toLowerCase().includes(needle)
    );
  });
}

export interface ExerciseGroup {
  readonly id: string;
  readonly title: string;
  readonly options: readonly ApiExerciseOption[];
}

/**
 * Sections in first-seen order rather than alphabetical: "Recent" is authored
 * first because it is what a coach reaches for, and sorting would bury it.
 */
export function groupExerciseOptions(
  options: readonly ApiExerciseOption[],
): readonly ExerciseGroup[] {
  const order: string[] = [];
  const byGroup = new Map<string, ApiExerciseOption[]>();

  for (const option of options) {
    const existing = byGroup.get(option.group);
    if (existing) {
      existing.push(option);
    } else {
      order.push(option.group);
      byGroup.set(option.group, [option]);
    }
  }

  return order.map((group) => ({
    id: group,
    title: group.toUpperCase(),
    options: byGroup.get(group) ?? [],
  }));
}

/** e.g. "15 exercises" — the count beside the search box. */
export function resultCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'exercise' : 'exercises'}`;
}
