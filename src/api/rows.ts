/**
 * Database rows → the shapes the app already speaks.
 *
 * Postgres is snake_case and normalised; the screens read camelCase objects
 * with their children embedded. Translating in one place means a column
 * rename is one edit here rather than a hunt through twenty modules, and it
 * keeps `src/api/types.ts` free of anything that exists only because of how
 * the rows are stored.
 *
 * Every row type below is derived from `database.types.ts` rather than
 * restated, so a migration that renames a column fails the build here instead
 * of quietly handing a screen `undefined`.
 */
import { exerciseGifUrl } from '@/lib/exerciseGif';
import { parseDestination } from '@/lib/notifications';
import { assignedLabel, programMeta, programStatusLabel } from '@/lib/programs';

import { ApiError } from './client';
import type { Database } from './database.types';
import type {
  ApiClientSession,
  ApiExerciseOption,
  ApiNotification,
  ApiNotificationGroup,
  ApiNotificationPerson,
  NotificationKind,
  ApiProgramBlock,
  ApiProgramDetail,
  ApiProgramRoutine,
  ApiProgramSummary,
  ApiRoutineInstance,
  ApiRoutineUpdate,
  ApiSessionExercise,
  ApiSessionSet,
} from './types';

type Tables = Database['public']['Tables'];

/* ------------------------------------------------------------------ *
 * Blocks. `program_blocks`, `routine_blocks` and `routine_update_blocks`
 * are the same shape in three tables — the copy is the point — so one
 * mapper serves all three.
 * ------------------------------------------------------------------ */

export type BlockRow = Pick<
  Tables['routine_blocks']['Row'],
  'id' | 'name' | 'scheme' | 'rpe' | 'target_kg' | 'note' | 'order_index'
>;

export function toBlock(row: BlockRow): ApiProgramBlock {
  return {
    id: row.id,
    name: row.name,
    scheme: row.scheme,
    rpe: row.rpe,
    targetKg: row.target_kg,
    note: row.note,
  };
}

/**
 * PostgREST returns embedded rows in no guaranteed order unless asked, and the
 * order of exercises in a routine is meaningful — so it is sorted here rather
 * than trusted, and every caller gets the same answer.
 */
export function toBlocks(rows: readonly BlockRow[] | null): readonly ApiProgramBlock[] {
  return [...(rows ?? [])].sort((a, b) => a.order_index - b.order_index).map(toBlock);
}

/* ------------------------------------------------------------------ *
 * Programs — what a coach writes. Never held by a client: they hold
 * copies, which are the routine instances further down.
 * ------------------------------------------------------------------ */

/**
 * `routine_instances(client_id)` is how a program knows who holds it. The link
 * is on the routine rather than the program, because assignment copies one
 * routine at a time — so the answer is the distinct clients across all of them.
 */
export const PROGRAM_SELECT =
  '*, program_routines(*, program_blocks(*), routine_instances(client_id))';

export type ProgramRoutineRow = Pick<
  Tables['program_routines']['Row'],
  'id' | 'name' | 'order_index'
> & {
  readonly program_blocks: readonly BlockRow[] | null;
  readonly routine_instances: readonly { readonly client_id: string }[] | null;
};

export type ProgramRow = Tables['programs']['Row'] & {
  readonly program_routines: readonly ProgramRoutineRow[] | null;
};

function toProgramRoutines(
  rows: readonly ProgramRoutineRow[] | null,
): readonly ApiProgramRoutine[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      id: row.id,
      name: row.name,
      blocks: toBlocks(row.program_blocks),
    }));
}

function assignedClientIds(rows: readonly ProgramRoutineRow[] | null): readonly string[] {
  const ids = new Set<string>();
  for (const routine of rows ?? []) {
    for (const instance of routine.routine_instances ?? []) ids.add(instance.client_id);
  }
  return [...ids];
}

export function toProgramDetail(row: ProgramRow): ApiProgramDetail {
  const routines = toProgramRoutines(row.program_routines);
  const assignedIds = assignedClientIds(row.program_routines);

  return {
    id: row.id,
    name: row.name,
    note: row.note,
    // Every display string here is derived rather than stored. They restate
    // fields the program already has, and a stored copy is one more thing an
    // edit can leave behind.
    meta: programMeta(row.weeks, routines),
    status: row.status,
    statusLabel: programStatusLabel(row.status, row.has_draft_changes),
    assignedIds,
    assignedLabel: assignedLabel(assignedIds.length),
    weeks: row.weeks,
    sessionsPerWeek: row.sessions_per_week,
    routines,
    hasDraftChanges: row.has_draft_changes,
  };
}

/** The library card reads the same fields the detail does — never a second copy. */
export function toProgramSummary(row: ProgramRow): ApiProgramSummary {
  const { id, name, meta, status, statusLabel, assignedIds, assignedLabel: label } =
    toProgramDetail(row);
  return { id, name, meta, status, statusLabel, assignedIds, assignedLabel: label };
}

export function toExerciseOption(
  row: Tables['exercises']['Row'],
  group: string,
): ApiExerciseOption {
  return {
    id: row.id,
    name: row.name,
    meta: row.meta,
    tag: row.tag,
    group,
    // `gif_path`, not `gif_url`: the latter is WorkoutX's own authenticated
    // endpoint and 401s from a device. NULL until somebody opens this one.
    gifUrl: exerciseGifUrl(row.gif_path),
  };
}

/* ------------------------------------------------------------------ *
 * Routine instances — what a client holds.
 * ------------------------------------------------------------------ */

export type RoutineUpdateRow = Pick<
  Tables['routine_updates']['Row'],
  'template_version' | 'proposed_at' | 'summary'
> & {
  readonly routine_update_blocks: readonly BlockRow[] | null;
};

/**
 * A row of `routine_instance_progress` with its children embedded.
 *
 * `routine_updates` arrives as a single object rather than an array: the table
 * has one row per instance at most, and PostgREST embeds a unique foreign key
 * as a to-one.
 */
export type RoutineInstanceRow = Tables['routine_instance_progress']['Row'] & {
  readonly routine_blocks?: readonly BlockRow[] | null;
  readonly routine_updates?: RoutineUpdateRow | null;
};

/**
 * What a routine is read with, everywhere.
 *
 * Through `routine_instance_progress` rather than `routine_instances`, for
 * `last_completed_at` — derived from finished workouts, and the thing that
 * decides which routine the client is offered next.
 */
export const ROUTINE_SELECT =
  '*, routine_blocks(*), routine_updates(*, routine_update_blocks(*))';

function toRoutineUpdate(row: RoutineUpdateRow | null | undefined): ApiRoutineUpdate | null {
  if (!row) return null;

  return {
    templateVersion: row.template_version,
    proposedAt: row.proposed_at,
    summary: row.summary,
    blocks: toBlocks(row.routine_update_blocks),
  };
}

export function toRoutineInstance(row: RoutineInstanceRow): ApiRoutineInstance {
  // Postgres records no nullability for a view's columns, so every column of
  // `routine_instance_progress` is generated as nullable even though the
  // columns underneath it are NOT NULL. Checking the two the app navigates by
  // turns an impossible row into an error the screen already renders, rather
  // than a routine with no id that the router then tries to open.
  if (row.id === null || row.client_id === null || row.name === null) {
    throw new ApiError('That routine came back incomplete.', null);
  }

  return {
    id: row.id,
    // The one field that separates a copy of a coach's routine from one the
    // client built. Everything downstream branches on it.
    templateId: row.program_routine_id,
    clientId: row.client_id,
    name: row.name,
    note: row.note,
    blocks: toBlocks(row.routine_blocks ?? null),
    orderIndex: row.order_index ?? 0,
    lastCompletedAt: row.last_completed_at,
    baseVersion: row.base_version,
    diverged: row.diverged ?? false,
    pendingUpdate: toRoutineUpdate(row.routine_updates),
  };
}

/* ------------------------------------------------------------------ *
 * Workouts.
 * ------------------------------------------------------------------ */

export type WorkoutSetRow = Pick<
  Tables['workout_sets']['Row'],
  'n' | 'weight_kg' | 'reps' | 'completed'
>;

export type WorkoutExerciseRow = Pick<
  Tables['workout_exercises']['Row'],
  'id' | 'name' | 'coach_note' | 'own_note' | 'order_index' | 'exercise_id'
> & {
  readonly workout_sets: readonly WorkoutSetRow[] | null;
};

export function toSessionSet(row: WorkoutSetRow): ApiSessionSet {
  return {
    n: row.n,
    weightKg: row.weight_kg,
    reps: row.reps,
    completed: row.completed,
  };
}

export function toSessionExercise(row: WorkoutExerciseRow): ApiSessionExercise {
  return {
    exerciseId: row.exercise_id ?? null,
    id: row.id,
    name: row.name,
    coachNote: row.coach_note,
    ownNote: row.own_note,
    sets: [...(row.workout_sets ?? [])].sort((a, b) => a.n - b.n).map(toSessionSet),
  };
}

export function toSessionExercises(
  rows: readonly WorkoutExerciseRow[] | null,
): readonly ApiSessionExercise[] {
  return [...(rows ?? [])].sort((a, b) => a.order_index - b.order_index).map(toSessionExercise);
}

export const SESSION_SELECT = '*, workout_exercises(*, workout_sets(*))';

export type WorkoutSessionRow = Pick<
  Tables['workout_sessions']['Row'],
  'id' | 'title' | 'started_at'
> & {
  readonly workout_exercises: readonly WorkoutExerciseRow[] | null;
};

export function toClientSession(row: WorkoutSessionRow): ApiClientSession {
  return {
    id: row.id,
    title: row.title,
    startedAt: row.started_at,
    exercises: toSessionExercises(row.workout_exercises),
    // Nothing stores an unread count yet — there is no notifications table, so
    // the honest answer is "none" rather than a number invented here. See the
    // note on `ApiClientSession`.
  };
}

/* ------------------------------------------------------------------ *
 * The other direction, for writes.
 * ------------------------------------------------------------------ */

export type RoutineBlockInsert = Tables['routine_blocks']['Insert'];

/** Position comes from the array, so a reordered list needs no extra field. */
export function toRoutineBlockInserts(
  routineInstanceId: string,
  blocks: readonly ApiProgramBlock[],
): readonly RoutineBlockInsert[] {
  return blocks.map((block, index) => ({
    routine_instance_id: routineInstanceId,
    name: block.name,
    scheme: block.scheme,
    rpe: block.rpe,
    target_kg: block.targetKg ?? null,
    note: block.note,
    order_index: index,
  }));
}

/* ------------------------------------------------------------------ *
 * Notifications.
 *
 * `notifications_feed` returns one flat, ordered row per item with the
 * group it belongs to stamped on it — SQL has no nested result, and a
 * second round trip for the headings would be worse than folding them
 * here. The rows arrive in order, so this walks them once and starts a
 * new group whenever the stamp changes.
 * ------------------------------------------------------------------ */

type NotificationFeedRow = Database['public']['Functions']['notifications_feed']['Returns'][number];

/** `person` and `destination` arrive as `Json`; neither is trusted as-is. */
function toPerson(raw: NotificationFeedRow['person']): ApiNotificationPerson | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { id, name, initials } = raw as Record<string, unknown>;
  return typeof id === 'string' && typeof name === 'string' && typeof initials === 'string'
    ? { id, name, initials }
    : null;
}

export function toNotificationGroups(
  rows: readonly NotificationFeedRow[],
): readonly ApiNotificationGroup[] {
  const groups: ApiNotificationGroup[] = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];
    const group =
      last && last.id === row.group_id
        ? last
        : (groups[groups.push({ id: row.group_id, title: row.group_title, items: [] }) - 1] as {
            id: string;
            title: string;
            items: ApiNotification[];
          });

    (group.items as ApiNotification[]).push({
      id: row.id,
      // The check constraint on `notifications.kind` is the authority; this
      // cast trusts it rather than re-listing eleven strings that would then
      // have to be kept in step with the migration.
      kind: row.kind as NotificationKind,
      title: row.title,
      body: row.body,
      when: row.when,
      unread: row.unread,
      person: toPerson(row.person),
      // Composed by the server and validated here — see `parseDestination`.
      destination: parseDestination(row.destination),
    });
  }

  return groups;
}
