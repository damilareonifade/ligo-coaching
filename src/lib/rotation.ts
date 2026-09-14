import type {
  ApiProgramBlock,
  ApiRoutine,
  ApiRoutineInstance,
  ApiRoutinePreviewRow,
} from '@/api/types';

/* ------------------------------------------------------------------ *
 * A program is a rotation, not a calendar.
 *
 * Nothing is due on a day, so nothing can be missed. The client works
 * through the cycle at their own pace, and the app only ever suggests
 * what is next — it never says they are late.
 * ------------------------------------------------------------------ */

/**
 * The routine to suggest next: whichever the client has gone longest without
 * doing, with never-done first and `orderIndex` breaking ties.
 *
 * Self-correcting by construction. Finishing a workout stamps it and the
 * ordering re-sorts, so doing them out of order still points at whatever has
 * been neglected — there is no cursor to keep in sync and nothing to drift.
 *
 * Only the coach's routines rotate. A routine the client built themselves is
 * theirs to run whenever, and putting it in the queue would have the app
 * nagging about a plan nobody prescribed.
 */
export function nextInRotation(instances: readonly ApiRoutineInstance[]): string | null {
  const inRotation = instances.filter((instance) => instance.templateId !== null);
  if (inRotation.length === 0) return null;

  const [next] = [...inRotation].sort((a, b) => {
    if (a.lastCompletedAt === null && b.lastCompletedAt === null) {
      return a.orderIndex - b.orderIndex;
    }
    // Never done comes first: it is the longest anyone has gone without it.
    if (a.lastCompletedAt === null) return -1;
    if (b.lastCompletedAt === null) return 1;

    const gap = Date.parse(a.lastCompletedAt) - Date.parse(b.lastCompletedAt);
    return gap !== 0 ? gap : a.orderIndex - b.orderIndex;
  });

  return next.id;
}

/** How many lifts a card lists before the client has to open the routine. */
const PREVIEW_ROWS = 3;

function previewOf(blocks: readonly ApiProgramBlock[]): readonly ApiRoutinePreviewRow[] {
  return blocks.slice(0, PREVIEW_ROWS).map((block) => ({
    name: block.name,
    scheme: block.scheme,
  }));
}

/**
 * The card a client picks a routine from, built out of the instance they hold.
 *
 * One function for both owners, and one for both backends: the mock fixtures
 * and the Supabase reads derive a card the same way, so the offline build and
 * the real one cannot disagree about which routine is next or what its chip
 * says.
 *
 * `coachName` is `null` when there is nobody to name — a routine whose coach
 * has since been detached still says where it came from.
 */
function summariseRoutine(
  instance: ApiRoutineInstance,
  nextId: string | null,
  coachName: string | null,
): ApiRoutine {
  const fromCoach = instance.templateId !== null;
  const from = coachName ?? 'your coach';

  return {
    id: instance.id,
    name: instance.name,
    note: instance.note,
    // The rotation's answer: whichever they have gone longest without doing.
    isCurrent: instance.id === nextId,
    owner: fromCoach ? 'coach' : 'you',
    // Provenance, not permission — a client may edit either. Saying a copy has
    // been changed matters because it is what a coach's next update will
    // collide with, and the client should not be surprised by that later.
    sourceLabel: fromCoach
      ? instance.diverged
        ? `From ${from} · edited by you`
        : `From ${from}`
      : 'Yours',
    preview: previewOf(instance.blocks),
    diverged: instance.diverged,
    lastCompletedAt: instance.lastCompletedAt,
    pendingUpdate: instance.pendingUpdate,
  };
}

/**
 * Every routine a client holds, as the cards the Train tab lays out.
 *
 * The whole list at once rather than one card at a time, because two of the
 * three derived facts are about the set: which routine is next in the
 * rotation, and the coach's first — a client's own work never displaces the
 * plan they are being coached through. Both are easy to forget at a call site
 * and impossible to forget here.
 *
 * `coachName` is a lookup rather than a value: which coach a routine came from
 * is a fact about that routine, and a client who has changed coaches still has
 * the older copies naming the person who wrote them.
 */
export function summariseRoutines(
  instances: readonly ApiRoutineInstance[],
  coachName: (instance: ApiRoutineInstance) => string | null,
): readonly ApiRoutine[] {
  const nextId = nextInRotation(instances);

  return [...instances]
    // Stable within each group, so the order they arrived in survives.
    .sort((a, b) => Number(b.templateId !== null) - Number(a.templateId !== null))
    .map((instance) => summariseRoutine(instance, nextId, coachName(instance)));
}

/** Monday 00:00 of the week containing `now`, in local time. */
export function startOfWeek(now: Date = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // getDay() is Sunday-first; shift so Monday starts the week.
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/** How many of these timestamps fall in the current week. */
export function countThisWeek(
  timestamps: readonly string[],
  now: Date = new Date(),
): number {
  const from = startOfWeek(now).getTime();
  return timestamps.filter((at) => {
    const time = Date.parse(at);
    return Number.isFinite(time) && time >= from && time <= now.getTime();
  }).length;
}

/**
 * "Never done" · "Last done today" · "Last done 4 days ago".
 *
 * Deliberately free of "overdue" and "late": the client chose not to do it
 * yet, which is the whole point of a rotation.
 */
export function lastDoneLabel(
  lastCompletedAt: string | null,
  now: Date = new Date(),
): string {
  if (!lastCompletedAt) return 'Never done';

  const then = Date.parse(lastCompletedAt);
  if (!Number.isFinite(then)) return 'Never done';

  const days = Math.floor((startOfDay(now) - startOfDay(new Date(then))) / 86_400_000);
  if (days <= 0) return 'Last done today';
  if (days === 1) return 'Last done yesterday';
  if (days < 7) return `Last done ${days} days ago`;

  const weeks = Math.floor(days / 7);
  return `Last done ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
