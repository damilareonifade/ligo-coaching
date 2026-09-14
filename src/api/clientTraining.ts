import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { lastDoneLabel, summariseRoutines } from '@/lib/rotation';
import { accessLabel, deriveAccess } from '@/lib/roster';

import { ApiError } from './client';
import {
  mockAddSessionExercise,
  mockApplyClientSet,
  mockClientSession,
  mockClientToday,
  mockDelay,
  mockFinishClientSession,
  mockRenameClientSession,
  mockSetExerciseNote,
  mockStartSessionId,
  mockTrainOverview,
} from './mocks';
import { queryKeys } from './queryKeys';
import {
  ROUTINE_SELECT,
  SESSION_SELECT,
  toClientSession,
  toRoutineInstance,
} from './rows';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import { SHARE_DOMAINS } from './types';
import type {
  ApiClientSession,
  ApiClientToday,
  ApiRoutine,
  ApiSharePermissions,
  ApiSessionExercise,
  ApiSessionSet,
  ApiTrainOverview,
  ApiWeeklyProgress,
} from './types';


const TODAY_COACH_SELECT =
  'coach_id, permissions, coach:users!coach_clients_coach_id_fkey(full_name)';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** "5 exercises · last done 4 days ago". No duration — nothing measures one. */
function planMeta(card: ApiRoutine): string {
  const count = card.preview.length;
  return `${count} ${count === 1 ? 'exercise' : 'exercises'} · ${lastDoneLabel(
    card.lastCompletedAt,
  ).toLowerCase()}`;
}

/** "Sees workouts and nutrition", or what they were given instead. */
function sharedWithCoachLine(permissions: ApiSharePermissions): string {
  const shared = SHARE_DOMAINS.filter((domain) => permissions[domain]);
  if (shared.length === 0) return 'Sees nothing yet';
  if (shared.length === 1) return `Sees ${shared[0]}`;
  return `Sees ${shared.slice(0, -1).join(', ')} and ${shared[shared.length - 1]}`;
}

/**
 * The Today screen: what to do next, how the week is going, and who is
 * coaching. Three of its four cards read the same rows the Train tab does —
 * Today asks "what next", Train asks "what have I got", and there is one
 * answer underneath both, which is why the plan here is derived through
 * `summariseRoutines` rather than composed a second way.
 *
 * The fourth card is calories and protein, and it appears only when the `food`
 * feature is on. Nothing about it is stubbed in the meantime: the payload says
 * `nutrition: null` and the screen renders three cards.
 */
async function fetchClientToday(): Promise<ApiClientToday> {
  if (env.useMocks) {
    return mockDelay(mockClientToday());
  }

  const clientId = await currentUserId();

  const [rows, week, links] = await Promise.all([
    supabase
      .from('routine_instance_progress')
      .select(`${ROUTINE_SELECT}, coach:users!routine_instances_coach_id_fkey(full_name)`)
      .eq('client_id', clientId)
      .order('order_index')
      .then(unwrap),
    fetchWeeklyProgress(clientId),
    supabase
      .from('coach_clients')
      .select(TODAY_COACH_SELECT)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .limit(1)
      .then(unwrap),
  ]);

  const coachNames = new Map<string, string | null>();
  const held = rows.map((row) => {
    const instance = toRoutineInstance(row);
    coachNames.set(instance.id, row.coach?.full_name ?? null);
    return instance;
  });

  // The rotation's own answer — whichever routine has gone longest without
  // being done — so Today and Train can never point at different ones.
  const cards = summariseRoutines(held, (instance) => coachNames.get(instance.id) ?? null);
  const next = cards.find((card) => card.isCurrent) ?? cards[0] ?? null;

  const link = links[0];
  const coachName = link?.coach?.full_name ?? null;
  const permissions = (link?.permissions ?? {}) as ApiSharePermissions;

  return {
    plan: next
      ? {
          id: next.id,
          title: next.name,
          meta: planMeta(next),
          source: next.sourceLabel,
          exerciseCount: next.preview.length,
        }
      : null,
    // Absent until the feature exists — see src/lib/features.ts.
    nutrition: null,
    coach:
      link && coachName
        ? {
            id: link.coach_id,
            name: coachName,
            initials: initialsOf(coachName),
            line1: coachName,
            line2: sharedWithCoachLine(permissions),
            permissionLabel: accessLabel[deriveAccess(permissions)],
          }
        : null,
    week,
  };
}

export function useClientTodayQuery(): UseQueryResult<ApiClientToday, Error> {
  return useQuery({ queryKey: queryKeys.clientTraining.today, queryFn: fetchClientToday });
}

/**
 * Sessions finished since Monday, against the program's target.
 *
 * Counted in the database rather than by pulling every session down and
 * filtering on the phone, and Monday-based on both sides — a week that starts
 * on a different day in each would make the coach's count disagree with the
 * client's.
 */
async function fetchWeeklyProgress(clientId: string): Promise<ApiWeeklyProgress> {
  const [week] = unwrap(await supabase.rpc('weekly_progress', { p_client_id: clientId }));
  return week ?? { done: 0, target: 0 };
}

async function fetchTrainOverview(): Promise<ApiTrainOverview> {
  if (env.useMocks) {
    return mockDelay(mockTrainOverview());
  }

  // Named explicitly: a coach reading this table sees every client they have
  // assigned to, through a policy of their own. "Mine" has to be said.
  const clientId = await currentUserId();

  const [rows, week] = await Promise.all([
    supabase
      .from('routine_instance_progress')
      .select(`${ROUTINE_SELECT}, coach:users!routine_instances_coach_id_fkey(full_name)`)
      .eq('client_id', clientId)
      .order('order_index')
      .then(unwrap),
    fetchWeeklyProgress(clientId),
  ]);

  // Who wrote a routine is a fact about that routine, not about the client —
  // copies from a previous coach keep naming the person who wrote them.
  const coachNames = new Map<string, string | null>();
  const held = rows.map((row) => {
    const instance = toRoutineInstance(row);
    coachNames.set(instance.id, row.coach?.full_name ?? null);
    return instance;
  });

  return {
    routines: summariseRoutines(held, (instance) => coachNames.get(instance.id) ?? null),
    week,
  };
}

export function useTrainOverviewQuery(): UseQueryResult<ApiTrainOverview, Error> {
  return useQuery({ queryKey: queryKeys.clientTraining.train, queryFn: fetchTrainOverview });
}

async function fetchClientSession(sessionId: string): Promise<ApiClientSession> {
  if (env.useMocks) {
    return mockDelay(mockClientSession(sessionId));
  }

  const { data, error, status } = await supabase
    .from('workout_sessions')
    .select(SESSION_SELECT)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  if (!data) throw new ApiError('That workout no longer exists.', 404);
  return toClientSession(data);
}

export function useClientSessionQuery(sessionId: string): UseQueryResult<ApiClientSession, Error> {
  return useQuery({
    queryKey: queryKeys.clientTraining.session(sessionId),
    queryFn: () => fetchClientSession(sessionId),
    enabled: sessionId.length > 0,
  });
}

export interface StartSessionInput {
  /**
   * The routine to work through — one the coach assigned or one the client
   * built, which are the same kind of thing and so take the same field.
   *
   * `null` starts an empty workout: no plan behind it, no exercises, added one
   * at a time from the session screen. A lifter who walks in without a plan
   * still needs somewhere to put the sets.
   */
  readonly planId: string | null;
}

async function postStartSession({ planId }: StartSessionInput): Promise<ApiClientSession> {
  if (env.useMocks) {
    return mockDelay(mockClientSession(mockStartSessionId(planId)));
  }

  // One call rather than a session insert, then an exercise per lift, then a
  // set per set — which on gym wifi is a long way to get half a workout.
  const sessionId = unwrap(
    await supabase.rpc('start_workout', { p_routine_instance_id: planId }),
  );
  return fetchClientSession(sessionId);
}

export function useStartSessionMutation(): UseMutationResult<
  ApiClientSession,
  Error,
  StartSessionInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postStartSession,
    // Seed the cache so the session screen paints from the start response
    // instead of flashing a skeleton for a session we already hold.
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.clientTraining.session(session.id), session);
    },
  });
}

/**
 * Replace the set with this number, or append it when there is none — writing
 * a set and adding one are the same request, because to the server both are
 * "this is set 4 of that exercise".
 */
function upsertSet(
  sets: readonly ApiSessionSet[],
  next: ApiSessionSet,
): readonly ApiSessionSet[] {
  return sets.some((existing) => existing.n === next.n)
    ? sets.map((existing) => (existing.n === next.n ? next : existing))
    : [...sets, next];
}

export interface LogClientSetInput {
  readonly sessionId: string;
  readonly exerciseId: string;
  readonly set: ApiSessionSet;
}

async function postClientSetLog({ sessionId, exerciseId, set }: LogClientSetInput): Promise<void> {
  if (env.useMocks) {
    mockApplyClientSet(sessionId, exerciseId, set);
    await mockDelay(undefined, 200);
    return;
  }

  // Writing a set and adding one are the same request — to the database both
  // are "this is set 4 of that exercise" — so this upserts on the key that
  // says so rather than branching on whether the row is already there.
  assertOk(
    await supabase.from('workout_sets').upsert(
      {
        workout_exercise_id: exerciseId,
        n: set.n,
        weight_kg: set.weightKg,
        reps: set.reps,
        completed: set.completed,
      },
      { onConflict: 'workout_exercise_id,n' },
    ),
  );
}

/**
 * Ticking a set mid-workout must land instantly — a lifter taps this between
 * reps, often on gym wifi. The set flips in the cache first and rolls back
 * if the write fails.
 */
export function useLogClientSetMutation(): UseMutationResult<void, Error, LogClientSetInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postClientSetLog,
    onMutate: async ({ sessionId, exerciseId, set }) => {
      const key = queryKeys.clientTraining.session(sessionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientSession>(key);

      queryClient.setQueryData<ApiClientSession>(key, (current) =>
        current
          ? {
              ...current,
              exercises: current.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, sets: upsertSet(exercise.sets, set) } : exercise,
              ),
            }
          : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.session(sessionId) });
    },
  });
}

export interface AddSessionExerciseInput {
  readonly sessionId: string;
  /** Already built by `newSessionExercise`, id and default sets included. */
  readonly exercise: ApiSessionExercise;
}

async function postAddSessionExercise({
  sessionId,
  exercise,
}: AddSessionExerciseInput): Promise<void> {
  if (env.useMocks) {
    mockAddSessionExercise(sessionId, exercise);
    await mockDelay(undefined, 200);
    return;
  }

  // The exercise and its opening sets land together, at the end of the order —
  // a half-written lift with no sets under it is not something to hand a
  // person mid-session.
  assertOk(
    await supabase.rpc('add_session_exercise', {
      p_workout_session_id: sessionId,
      // Minted on the phone, so the card already on screen and the row now
      // stored are the same row.
      p_exercise_id: exercise.id,
      p_name: exercise.name,
      // The catalogue link, which is a different thing from the row id above
      // despite the older parameter's name — see the migration.
      p_catalogue_id: exercise.exerciseId ?? undefined,
      p_sets: exercise.sets.map((set) => ({
        n: set.n,
        weight_kg: set.weightKg,
        reps: set.reps,
        completed: set.completed,
      })),
    }),
  );
}

/**
 * Adding a lift mid-workout lands the same way ticking a set does: the card
 * appears at once and is pulled back out if the write fails. Because the id
 * was minted on the phone there is nothing to reconcile when the response
 * arrives — the optimistic row and the server row are the same row.
 */
export function useAddSessionExerciseMutation(): UseMutationResult<
  void,
  Error,
  AddSessionExerciseInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postAddSessionExercise,
    onMutate: async ({ sessionId, exercise }) => {
      const key = queryKeys.clientTraining.session(sessionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientSession>(key);

      queryClient.setQueryData<ApiClientSession>(key, (current) =>
        current ? { ...current, exercises: [...current.exercises, exercise] } : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.session(sessionId) });
    },
  });
}

export interface RenameSessionInput {
  readonly sessionId: string;
  readonly title: string;
}

async function patchSessionTitle({ sessionId, title }: RenameSessionInput): Promise<void> {
  if (env.useMocks) {
    mockRenameClientSession(sessionId, title);
    await mockDelay(undefined, 200);
    return;
  }
  assertOk(
    await supabase.from('workout_sessions').update({ title }).eq('id', sessionId),
  );
}

/** Renaming a workout — "Upper A" is a starting point, not a fixed label. */
export function useRenameSessionMutation(): UseMutationResult<void, Error, RenameSessionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchSessionTitle,
    onMutate: async ({ sessionId, title }) => {
      const key = queryKeys.clientTraining.session(sessionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientSession>(key);

      queryClient.setQueryData<ApiClientSession>(key, (current) =>
        current ? { ...current, title } : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.session(sessionId) });
    },
  });
}

export interface SetExerciseNoteInput {
  readonly sessionId: string;
  readonly exerciseId: string;
  /** `null` clears it. Only ever the client's own note — see `ApiSessionExercise`. */
  readonly note: string | null;
}

async function patchExerciseNote({
  sessionId,
  exerciseId,
  note,
}: SetExerciseNoteInput): Promise<void> {
  if (env.useMocks) {
    mockSetExerciseNote(sessionId, exerciseId, note);
    await mockDelay(undefined, 200);
    return;
  }
  // `own_note` only. The coach's cue is a separate column for exactly this
  // reason: writing one must never erase the other.
  assertOk(
    await supabase.from('workout_exercises').update({ own_note: note }).eq('id', exerciseId),
  );
}

export function useSetExerciseNoteMutation(): UseMutationResult<
  void,
  Error,
  SetExerciseNoteInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchExerciseNote,
    onMutate: async ({ sessionId, exerciseId, note }) => {
      const key = queryKeys.clientTraining.session(sessionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientSession>(key);

      queryClient.setQueryData<ApiClientSession>(key, (current) =>
        current
          ? {
              ...current,
              exercises: current.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, ownNote: note } : exercise,
              ),
            }
          : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.session(sessionId) });
    },
  });
}

export interface FinishSessionInput {
  readonly sessionId: string;
}

async function postFinishSession({ sessionId }: FinishSessionInput): Promise<void> {
  if (env.useMocks) {
    mockFinishClientSession(sessionId);
    await mockDelay(undefined, 300);
    return;
  }
  // The stamp is the whole of it: an unfinished workout counts for nothing and
  // advances no rotation, and this is what turns it into one that has been
  // done. `last_completed_at` and the weekly count both derive from it.
  assertOk(
    await supabase
      .from('workout_sessions')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', sessionId)
      .is('finished_at', null),
  );
}

export function useFinishSessionMutation(): UseMutationResult<void, Error, FinishSessionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postFinishSession,
    // Finishing rewrites both summaries the client lands back on.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.today });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.train });
    },
  });
}
