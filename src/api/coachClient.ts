import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  buildReviewDomains,
  checkInRows,
  healthRows,
  markRequested,
  metricsRows,
} from '@/lib/clientReview';
import { checkInFromRow } from '@/lib/checkIns';
import { env } from '@/lib/env';
import { readUnits } from '@/lib/unitPreference';
import { withLabelCounts } from '@/lib/roster';

import { ApiError } from './client';
import {
  mockClientReview,
  mockDelay,
  mockAdjustLiveSet,
  mockLiveSession,
  mockRequestAccess,
  mockRoutinesForClient,
  mockWeeklyProgress,
  mockSaveRoutineInstance,
  mockSetClientLabel,
} from './mocks';
import { queryKeys } from './queryKeys';
import { ROUTINE_SELECT, toRoutineInstance } from './rows';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type {
  ApiClientReview,
  ApiLiveSession,
  ApiReviewDomain,
  ApiReviewSession,
  ApiRoster,
  ApiRoutineInstance,
  ApiSharePermissions,
  ApiWeeklyProgress,
} from './types';

/* ------------------------------------------------------------------ *
 * The coach's view of one client.
 *
 * Two reads and two writes, and the writes are deliberately small.
 * Nothing here can widen what the coach sees: setting a label files a
 * row on the coach's own side, and requesting access records a
 * question. The one thing that changes what a coach can see is a
 * client answering it, on their own screen, in their own app.
 * ------------------------------------------------------------------ */


/** "MA" from "Maya Andersson". */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

interface WeeklyRow {
  readonly week_start: string;
  readonly done: number;
  readonly target: number;
}

/**
 * "92% adherence" across the whole window rather than the latest week — one
 * quiet week should not read as a collapse, and one good week should not
 * cover for a month.
 */
function adherenceLabel(history: readonly WeeklyRow[]): string {
  const target = history.reduce((sum, week) => sum + week.target, 0);
  if (target === 0) return 'No target set';
  const done = history.reduce((sum, week) => sum + week.done, 0);
  return `${Math.round((done / target) * 100)}% adherence`;
}

interface SessionRow {
  readonly id: string;
  readonly title: string;
  readonly started_at: string;
  readonly finished_at: string | null;
  readonly workout_exercises: readonly {
    readonly workout_sets: readonly { readonly completed: boolean }[];
  }[];
}

function toReviewSession(row: SessionRow): ApiReviewSession {
  const sets = row.workout_exercises.flatMap((exercise) => exercise.workout_sets);
  const done = sets.filter((set) => set.completed).length;

  const parts = [`${done} of ${sets.length} sets`];
  if (row.finished_at) {
    const minutes = Math.round(
      (Date.parse(row.finished_at) - Date.parse(row.started_at)) / 60_000,
    );
    if (Number.isFinite(minutes) && minutes > 0) parts.push(`${minutes} min`);
  }
  return {
    id: row.id,
    name: row.title,
    meta: parts.join(' · '),
    // An unfinished workout is one in progress, not one that was missed —
    // nothing in this app is ever late. See src/lib/rotation.ts.
    tag: row.finished_at ? 'Done' : 'Today',
  };
}

/**
 * Five sessions is what the card shows, and pulling their sets with them is
 * what makes "7 of 7 sets" true rather than a guess. Bounded deliberately: a
 * client with three years of history must not send three years of rows.
 */
const REVIEW_SESSIONS_SELECT =
  'id, title, started_at, finished_at, workout_exercises(workout_sets(completed))';

async function fetchClientReview(clientId: string): Promise<ApiClientReview> {
  // The reader's units, not the client's — a coach on kilograms sees
  // kilograms whoever they are looking at.
  const units = readUnits();
  if (env.useMocks) {
    const review = mockClientReview(clientId);
    if (!review) throw new ApiError('That client is no longer on your roster.', 404);
    return mockDelay(review);
  }

  const [links, history, requests, sessions] = await Promise.all([
    supabase
      .from('roster_clients')
      .select('client_id, full_name, label_id, permissions, program_name, is_training, log_for')
      .eq('coach_id', await currentUserId())
      .eq('client_id', clientId)
      .maybeSingle()
      .then((result) => result.data),
    supabase.rpc('client_weekly_history', { p_client_id: clientId, p_weeks: 8 }).then(unwrap),
    supabase
      .from('access_requests')
      .select('domain')
      .eq('client_id', clientId)
      .is('answered_at', null)
      .then(unwrap),
    supabase
      .from('workout_sessions')
      .select(REVIEW_SESSIONS_SELECT)
      .eq('client_id', clientId)
      .order('started_at', { ascending: false })
      .limit(5)
      .then(unwrap),
  ]);

  // RLS makes someone who is not on this roster invisible rather than
  // forbidden, so "no such client" and "not yours" arrive identically.
  if (!links) throw new ApiError('That client is no longer on your roster.', 404);

  const name = links.full_name ?? '';
  const permissions = (links.permissions ?? {}) as ApiSharePermissions;

  // Only what the client shared is even asked for. RLS would refuse the rest
  // anyway, but a request nobody is allowed to answer is still a request.
  const [measurements, health, checkIns] = await Promise.all([
    permissions.metrics
      ? supabase
          .from('body_measurements')
          .select('measured_at, weight_kg, waist_cm, body_fat_pct')
          .eq('client_id', clientId)
          .order('measured_at', { ascending: false })
          .limit(12)
          .then(unwrap)
      : Promise.resolve([]),
    permissions.health
      ? supabase
          .from('health_entries')
          .select('section, label, value')
          .eq('client_id', clientId)
          .order('section')
          .order('order_index')
          .then(unwrap)
      : Promise.resolve([]),
    permissions.monthly
      ? supabase
          .rpc('monthly_check_ins', { p_client_id: clientId, p_months: 3 })
          .then(unwrap)
      : Promise.resolve([]),
  ]);

  const months = checkIns.map((row, index) =>
    checkInFromRow(row, checkIns[index + 1] ?? null, units),
  );

  return {
    clientId,
    name,
    initials: initialsOf(name),
    programLine: links.program_name ?? 'No program assigned',
    labelId: links.label_id,
    adherence: adherenceLabel(history),
    // "W1" … "W8", oldest first, which is the order the history comes back in
    // and the order the bars are drawn.
    adherenceBars: history.map((week, index) => ({
      label: `W${index + 1}`,
      value: week.target > 0 ? Math.round((week.done / week.target) * 100) : 0,
    })),
    domains: buildReviewDomains({
      clientName: name,
      permissions,
      requested: new Set(
        requests.map((row) => row.domain as ApiReviewDomain['id']),
      ),
      // Nutrition is the one still empty when granted — it has no tables yet.
      // The card says the client shares it, which is true, and shows nothing,
      // which is also true.
      rows: {
        metrics: metricsRows(measurements, units),
        health: healthRows(health),
        monthly: checkInRows(months, units),
      },
    }),
    sessions: sessions.map(toReviewSession),
    isTraining: links.is_training ?? false,
    canLogFor: links.log_for ?? false,
  };
}

export function useClientReviewQuery(clientId: string): UseQueryResult<ApiClientReview, Error> {
  return useQuery({
    queryKey: queryKeys.coachClient.review(clientId),
    queryFn: () => fetchClientReview(clientId),
    enabled: clientId.length > 0,
  });
}

export interface SetClientLabelInput {
  readonly clientId: string;
  /** `null` unfiles them. A label is the coach's filing, never a permission. */
  readonly labelId: string | null;
}

async function putClientLabel({ clientId, labelId }: SetClientLabelInput): Promise<void> {
  if (env.useMocks) {
    mockSetClientLabel(clientId, labelId);
    await mockDelay(undefined, 200);
    return;
  }
  // The coach's own filing, on their own link — the consent trigger refuses
  // this column to the client, and RLS scopes it to this coach's row.
  assertOk(
    await supabase
      .from('coach_clients')
      .update({ label_id: labelId })
      .eq('coach_id', await currentUserId())
      .eq('client_id', clientId),
  );
}

/**
 * Optimistic on both caches at once, and that pairing is the point.
 *
 * The chip has to land under the thumb, like every other label write. But the
 * coach usually taps it on the way back to the roster, so the roster's own
 * copy — its groups, its label counts — is patched in the same beat. Counts
 * are recomposed rather than incremented, exactly as src/api/roster.ts does,
 * so the optimistic roster is the roster the refetch will hand back.
 */
export function useSetClientLabelMutation(): UseMutationResult<
  void,
  Error,
  SetClientLabelInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: putClientLabel,
    onMutate: async ({ clientId, labelId }) => {
      const reviewKey = queryKeys.coachClient.review(clientId);
      const rosterKey = queryKeys.roster;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: reviewKey }),
        queryClient.cancelQueries({ queryKey: rosterKey }),
      ]);

      const previousReview = queryClient.getQueryData<ApiClientReview>(reviewKey);
      const previousRoster = queryClient.getQueryData<ApiRoster>(rosterKey);

      queryClient.setQueryData<ApiClientReview>(reviewKey, (current) =>
        current ? { ...current, labelId } : current,
      );

      queryClient.setQueryData<ApiRoster>(rosterKey, (current) => {
        if (!current) return current;
        const clients = current.clients.map((entry) =>
          entry.id === clientId ? { ...entry, labelId } : entry,
        );
        return { ...current, clients, labels: withLabelCounts(current.labels, clients) };
      });

      return { previousReview, previousRoster, reviewKey, rosterKey };
    },
    onError: (_error, _input, context) => {
      if (!context) return;
      if (context.previousReview) {
        queryClient.setQueryData(context.reviewKey, context.previousReview);
      }
      if (context.previousRoster) {
        queryClient.setQueryData(context.rosterKey, context.previousRoster);
      }
    },
    onSettled: (_data, _error, { clientId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachClient.review(clientId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.roster });
    },
  });
}

export interface RequestAccessInput {
  readonly clientId: string;
  readonly domainId: ApiReviewDomain['id'];
}

async function postAccessRequest({ clientId, domainId }: RequestAccessInput): Promise<void> {
  if (env.useMocks) {
    mockRequestAccess(clientId, domainId);
    await mockDelay(undefined, 300);
    return;
  }
  // A question, never a grant — `request_access` cannot widen what this coach
  // sees, and refuses outright for a domain the client already shares.
  // Idempotent while it is open, so two taps ask once rather than sending the
  // person on the other end the same thing twice.
  unwrap(await supabase.rpc('request_access', { p_client_id: clientId, p_domain: domainId }));
}

/**
 * Optimistic, and it flips a domain to `requested` and nothing else.
 *
 * `markRequested` will not touch a granted domain, so the worst a race here
 * can do is show "Requested" under a card that is already shared — it cannot
 * open one that is not. The button going flat immediately matters for a
 * different reason than usual: a coach who taps twice has asked twice, and the
 * client is the one who hears about it.
 */
export function useRequestAccessMutation(): UseMutationResult<void, Error, RequestAccessInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postAccessRequest,
    onMutate: async ({ clientId, domainId }) => {
      const key = queryKeys.coachClient.review(clientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientReview>(key);

      queryClient.setQueryData<ApiClientReview>(key, (current) =>
        current ? { ...current, domains: markRequested(current.domains, domainId) } : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, { clientId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachClient.review(clientId) });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The live session.
 * ------------------------------------------------------------------ */

const LIVE_SELECT =
  'workout_exercises(id, name, coach_note, order_index, workout_sets(id, n, weight_kg, reps, completed, updated_by, created_at))';

/**
 * What the coach may do here, said on the screen rather than discovered when a
 * write is refused. The read-only wording is the promise the screen has always
 * made; the other is what `log_for` actually buys.
 */
function liveNotice(canEdit: boolean, firstName: string): string {
  return canEdit
    ? `You can change the load and reps on sets ${firstName} has not done yet. Ticking them off stays theirs.`
    : `Read-only. ${firstName} would need to let you log on their behalf before you could change anything here.`;
}

async function fetchLiveSession(clientId: string): Promise<ApiLiveSession | null> {
  if (env.useMocks) {
    return mockDelay(mockLiveSession(clientId));
  }

  // The view answers "is anyone training" for this pair, and carries the
  // client's name and the log_for switch with it.
  const [live] = unwrap(
    await supabase
      .from('coach_live_sessions')
      .select('client_id, full_name, session_id, title, started_at, log_for')
      .eq('coach_id', await currentUserId())
      .eq('client_id', clientId)
      .limit(1),
  );

  // Nobody training is a normal answer, not a missing record.
  if (!live?.session_id) return null;

  const { data: session, error, status } = await supabase
    .from('workout_sessions')
    .select(LIVE_SELECT)
    .eq('id', live.session_id)
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  // The view said it was live a moment ago; if it has gone, so has the answer.
  if (!session) return null;

  const name = live.full_name ?? '';
  const canEdit = live.log_for ?? false;

  return {
    clientId,
    clientName: name,
    title: live.title ?? '',
    startedAt: live.started_at ?? new Date().toISOString(),
    canEdit,
    notice: liveNotice(canEdit, name.split(' ')[0] || 'They'),
    exercises: [...session.workout_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map((exercise) => {
        const sets = [...exercise.workout_sets].sort((a, b) => a.n - b.n);
        const done = sets.filter((set) => set.completed).length;

        return {
          id: exercise.id,
          name: exercise.name,
          note: exercise.coach_note ?? '',
          progress: `${done} of ${sets.length}`,
          sets: sets.map((set) => ({
            id: set.id,
            n: set.n,
            weightKg: Number(set.weight_kg),
            reps: set.reps,
            completed: set.completed,
            // `updated_by` is NULL whenever the client wrote it themselves.
            changedByCoach: set.updated_by !== null,
          })),
        };
      }),
  };
}

export interface AdjustLiveSetInput {
  readonly clientId: string;
  readonly setId: string;
  readonly weightKg: number;
  readonly reps: number;
}

/**
 * Changing a set the client has not reached yet.
 *
 * Deliberately only the load and the reps. Ticking a set off is a claim about
 * what somebody did with their body, and the database refuses it from anyone
 * but them — see `enforce_workout_set_column_rules`.
 */
async function patchLiveSet({ setId, weightKg, reps }: AdjustLiveSetInput): Promise<void> {
  if (env.useMocks) {
    mockAdjustLiveSet(setId, weightKg, reps);
    await mockDelay(undefined, 200);
    return;
  }
  assertOk(
    await supabase
      .from('workout_sets')
      .update({ weight_kg: weightKg, reps })
      .eq('id', setId),
  );
}

/**
 * Optimistic, because the coach is standing next to someone about to lift and
 * a spinner is the wrong thing to be looking at. It rolls back if the write is
 * refused — which it will be the moment the client ticks that set off.
 */
export function useAdjustLiveSetMutation(): UseMutationResult<
  void,
  Error,
  AdjustLiveSetInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchLiveSet,
    onMutate: async ({ clientId, setId, weightKg, reps }) => {
      const key = queryKeys.coachClient.live(clientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiLiveSession | null>(key);

      queryClient.setQueryData<ApiLiveSession | null>(key, (current) =>
        current
          ? {
              ...current,
              exercises: current.exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id === setId
                    ? { ...set, weightKg, reps, changedByCoach: true }
                    : set,
                ),
              })),
            }
          : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, { clientId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachClient.live(clientId) });
    },
  });
}

/**
 * Polls while the screen is open, because the promise on it is that sets
 * appear as they are logged. `null` is a valid answer, not an error: the
 * session ended, and the screen has a state that says so.
 */
export function useLiveSessionQuery(
  clientId: string,
): UseQueryResult<ApiLiveSession | null, Error> {
  return useQuery({
    queryKey: queryKeys.coachClient.live(clientId),
    queryFn: () => fetchLiveSession(clientId),
    enabled: clientId.length > 0,
    refetchInterval: 15_000,
  });
}

/* ------------------------------------------------------------------ *
 * The copies one client holds.
 *
 * A coach editing here changes that client's routine and nobody
 * else's — the point of assignment copying rather than pointing. To
 * change it for everyone the coach edits their own template and
 * publishes, which asks each client separately.
 * ------------------------------------------------------------------ */

export interface ApiClientRoutines {
  readonly routines: readonly ApiRoutineInstance[];
  readonly week: ApiWeeklyProgress;
}

async function fetchClientRoutines(clientId: string): Promise<ApiClientRoutines> {
  if (env.useMocks) {
    return mockDelay({
      routines: mockRoutinesForClient(clientId),
      week: mockWeeklyProgress(clientId),
    });
  }

  // The same read the client's own Train tab makes, pointed at somebody else.
  // What comes back is decided by policy rather than by this query: copies
  // this coach assigned, plus anything the client shares through `workouts`.
  const [rows, week] = await Promise.all([
    supabase
      .from('routine_instance_progress')
      .select(ROUTINE_SELECT)
      .eq('client_id', clientId)
      .order('order_index')
      .then(unwrap),
    supabase.rpc('weekly_progress', { p_client_id: clientId }).then(unwrap),
  ]);

  return {
    routines: rows.map(toRoutineInstance),
    week: week[0] ?? { done: 0, target: 0 },
  };
}

/**
 * What this client holds and how much of it they have done this week. One
 * query for both, so the coach's view of the rotation cannot disagree with
 * itself about what has happened.
 */
export function useClientRoutinesQuery(
  clientId: string,
): UseQueryResult<ApiClientRoutines, Error> {
  return useQuery({
    queryKey: queryKeys.coachClient.routines(clientId),
    queryFn: () => fetchClientRoutines(clientId),
    enabled: clientId.length > 0,
  });
}

export interface SaveClientRoutineForCoachInput {
  readonly clientId: string;
  readonly routine: ApiRoutineInstance;
}

async function patchClientRoutine({
  routine,
}: SaveClientRoutineForCoachInput): Promise<ApiRoutineInstance> {
  // A coach's edit to one copy moves it away from the template just as the
  // client's own would — divergence is about the copy, not about who typed.
  const saved: ApiRoutineInstance = { ...routine, diverged: true };

  if (env.useMocks) {
    mockSaveRoutineInstance(saved);
    return mockDelay(saved, 250);
  }

  // One call, not an update plus a block replace: between the two a client
  // mid-program has a routine with no exercises in it.
  unwrap(
    await supabase.rpc('save_client_routine', {
      p_routine_instance_id: routine.id,
      p_name: routine.name,
      p_note: routine.note,
      p_blocks: routine.blocks.map((block, index) => ({
        name: block.name,
        scheme: block.scheme,
        rpe: block.rpe,
        target_kg: block.targetKg ?? null,
        note: block.note,
        order_index: index,
        // The blocks are replaced wholesale, so anything left out of this
        // object is a field cleared — which is how a coach fixing a typo used
        // to blank the distance on a client's treadmill.
        exercise_id: block.exerciseId ?? null,
        target_distance_km: block.targetDistanceKm ?? null,
        target_duration_seconds: block.targetDurationSeconds ?? null,
      })),
    }),
  );

  return saved;
}

export function useSaveClientRoutineForCoachMutation(): UseMutationResult<
  ApiRoutineInstance,
  Error,
  SaveClientRoutineForCoachInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchClientRoutine,
    onSuccess: (_routine, { clientId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachClient.routines(clientId) });
      // The client is looking at the same row from the other side.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.train });
    },
  });
}
