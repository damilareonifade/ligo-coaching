import type {
  ApiExerciseOption,
  ApiProgramBlock,
  ApiProgramRoutine,
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

/** Header total for a routine, e.g. "14 sets". Empty ones say so in words. */
export function setsLabel(blocks: readonly ApiProgramBlock[]): string {
  const count = totalSets(blocks);
  if (count === 0) return 'No sets yet';
  return `${count} ${count === 1 ? 'set' : 'sets'}`;
}

/* ------------------------------------------------------------------ *
 * Editing a scheme. It is display text, so the editor has to take it
 * apart and put it back together in exactly the shape the rest of the
 * app reads — the multiplication sign is U+00D7, not the letter x.
 * ------------------------------------------------------------------ */

export interface SchemeParts {
  readonly sets: number;
  readonly reps: number;
}

export const DEFAULT_REPS = 10;

/** Falls back rather than throwing: a scheme is free text and may be anything. */
export function parseScheme(scheme: string): SchemeParts {
  const match = /^\s*(\d+)\s*[×xX]\s*(\d+)/.exec(scheme);
  if (!match) return { sets: parseSetCount(scheme) || 3, reps: DEFAULT_REPS };

  return { sets: Number(match[1]), reps: Number(match[2]) };
}

export function composeScheme(sets: number, reps: number): string {
  return `${sets} × ${reps}`;
}

/** "RPE 8" → "8". The editor shows the number; the block stores the label. */
export function parseRpe(rpe: string): string {
  return /(\d+(?:\.\d+)?)/.exec(rpe)?.[1] ?? '';
}

/** "8" → "RPE 8". Blank stays blank — an RPE nobody set is not an RPE of 0. */
export function composeRpe(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';

  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return `RPE ${Number(parsed.toFixed(1))}`;
}

/* ------------------------------------------------------------------ *
 * Assignment. Zero is not "Assigned to 0 clients" — a program nobody
 * holds is unassigned, and the card should say that plainly.
 * ------------------------------------------------------------------ */

export function assignedLabel(count: number): string {
  if (count <= 0) return 'Not assigned';
  return `Assigned to ${count} ${count === 1 ? 'client' : 'clients'}`;
}

/**
 * The chip on a program card.
 *
 * Draft changes beat the status itself: a published program the coach has
 * since edited is ahead of every copy clients hold, and saying "Published"
 * there would be a claim about their copies that is no longer true.
 */
export function programStatusLabel(status: ProgramStatus, hasDraftChanges: boolean): string {
  if (status === 'archived') return 'Archived';
  if (status === 'draft') return 'Draft';
  return hasDraftChanges ? 'Draft changes' : 'Published';
}

/**
 * The line under a program's name — "6 weeks · 4 routines".
 *
 * Composed rather than stored: it is entirely a restatement of fields the
 * program already has, and a stored copy is one more thing an edit can leave
 * behind. A single-routine program is a routine, and says so.
 */
export function programMeta(
  weeks: number,
  routines: readonly ApiProgramRoutine[],
): string {
  if (routines.length === 1 && weeks <= 1) {
    const count = routines[0].blocks.length;
    return `Routine · ${count} ${count === 1 ? 'exercise' : 'exercises'}`;
  }

  const count = routines.length;
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} · ${count} ${count === 1 ? 'routine' : 'routines'}`;
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

/**
 * Names for a freshly chosen routine count — "Routine 1" … "Routine n".
 * A starting point only: the coach renames them to Upper A, Push, whatever
 * they actually call them, and that name is what the client is handed.
 */
export function buildRoutineNames(routineCount: number): readonly string[] {
  return Array.from({ length: Math.max(0, routineCount) }, (_, index) => `Routine ${index + 1}`);
}

/**
 * Growing or shrinking the count keeps the routines already filled in —
 * dropping from 5 to 4 and back must not silently empty routine 5's blocks,
 * and must not lose a name the coach typed.
 */
export function resizeRoutines(
  routines: readonly ApiProgramRoutine[],
  routineCount: number,
): readonly ApiProgramRoutine[] {
  return buildRoutineNames(routineCount).map(
    (name, index) => routines[index] ?? { id: `routine-${index + 1}`, name, blocks: [] },
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
    targetKg: null,
    note: null,
  };
}

/** "60", "62.5" or "" → a weight or none. Zero is none, not a weight. */
export function parseTargetKg(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(1));
}

/** The other direction, for seeding the field. `null` shows an empty box. */
export function formatTargetKg(targetKg: number | null | undefined): string {
  return targetKg === null || targetKg === undefined ? '' : String(targetKg);
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
