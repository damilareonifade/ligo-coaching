/**
 * The routines a client holds — see `ApiRoutineInstance`.
 *
 * One model for two things that used to be separate: a copy of a coach's
 * routine, and one the client built themselves. The only difference is whether
 * a `templateId` sits behind it.
 *
 * Deliberately separate from `src/api/coachPrograms.ts`, which looks similar
 * and is not the same thing: that writes the coach's *templates*. Saving here
 * must never reach the coach's library.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { ApiError } from './client';
import {
  mockAcceptUpdate,
  mockDeclineUpdate,
  mockDeleteOwnRoutines,
  mockDeleteRoutineInstance,
  mockDelay,
  mockRoutineInstance,
  mockSaveRoutineInstance,
} from './mocks';
import { queryKeys } from './queryKeys';
import { toRoutineInstance } from './rows';
import { assertOk, supabase, unwrap } from './supabase';
import type { ApiProgramBlock, ApiRoutineInstance } from './types';

/**
 * A routine is read through `routine_instance_progress` rather than
 * `routine_instances`, for `last_completed_at` — which is derived from
 * finished workouts and decides what the client is offered next.
 *
 * `routine_updates` embeds as an object, not an array: one proposal per copy
 * at most, enforced by a unique key the database reads back as a to-one.
 */
const ROUTINE_SELECT =
  '*, routine_blocks(*), routine_updates(*, routine_update_blocks(*))' as const;

async function fetchClientRoutine(routineId: string): Promise<ApiRoutineInstance> {
  if (env.useMocks) {
    const routine = mockRoutineInstance(routineId);
    if (!routine) throw new ApiError('That routine no longer exists.', 404);
    return mockDelay(routine);
  }

  const { data, error, status } = await supabase
    .from('routine_instance_progress')
    .select(ROUTINE_SELECT)
    .eq('id', routineId)
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  // RLS makes someone else's routine invisible rather than forbidden, so a
  // deleted routine and one that was never theirs arrive here identically.
  if (!data) throw new ApiError('That routine no longer exists.', 404);
  return toRoutineInstance(data);
}

export function useClientRoutineQuery(
  routineId: string,
): UseQueryResult<ApiRoutineInstance, Error> {
  return useQuery({
    queryKey: queryKeys.clientRoutines.detail(routineId),
    queryFn: () => fetchClientRoutine(routineId),
    enabled: routineId.length > 0,
  });
}

export interface SaveClientRoutineInput {
  /** Present for an edit, absent for a new routine. */
  readonly id?: string;
  readonly name: string;
  /** Free text about the routine as a whole — `null` clears it. */
  readonly note: string | null;
  readonly blocks: readonly ApiProgramBlock[];
}

function saveMockRoutine(
  input: SaveClientRoutineInput,
  name: string,
  note: string | null,
): Promise<ApiRoutineInstance> {
  const existing = input.id ? mockRoutineInstance(input.id) : null;

  const routine: ApiRoutineInstance = {
    id: input.id ?? `rou-${Date.now()}`,
    // An edit keeps whatever was behind it; a new routine has nothing behind it.
    templateId: existing?.templateId ?? null,
    clientId: existing?.clientId ?? 'me',
    name,
    note,
    blocks: input.blocks,
    // A routine the client builds sits outside the rotation — see
    // `nextInRotation`. An edit keeps whatever place it already had.
    orderIndex: existing?.orderIndex ?? 0,
    lastCompletedAt: existing?.lastCompletedAt ?? null,
    baseVersion: existing?.baseVersion ?? null,
    // Editing a copy of a coach's routine is exactly what divergence means.
    diverged: existing?.templateId != null ? true : (existing?.diverged ?? false),
    pendingUpdate: existing?.pendingUpdate ?? null,
  };

  mockSaveRoutineInstance(routine);
  return mockDelay(routine, 250);
}

async function saveClientRoutine(input: SaveClientRoutineInput): Promise<ApiRoutineInstance> {
  const name = input.name.trim();
  // An emptied box clears the note rather than saving a blank one.
  const trimmedNote = input.note?.trim() ?? '';
  const note = trimmedNote.length > 0 ? trimmedNote : null;

  if (env.useMocks) return saveMockRoutine(input, name, note);

  // One call, not four. The builder hands back the whole exercise list, so a
  // save replaces what is stored — and between the delete and the insert the
  // routine has no exercises in it, which is not a state to leave a dropped
  // connection in. `save_routine` does both in one transaction, creating the
  // routine when given no id.
  const id = unwrap(
    await supabase.rpc('save_routine', {
      p_name: name,
      p_note: note,
      p_routine_instance_id: input.id,
      p_blocks: input.blocks.map((block, index) => ({
        name: block.name,
        scheme: block.scheme,
        rpe: block.rpe,
        target_kg: block.targetKg ?? null,
        note: block.note,
        // Position comes from the array, so a reordered list needs no extra
        // field on the block itself.
        order_index: index,
      })),
    }),
  );

  // Read it back rather than assembling it here: `diverged` and the ordering
  // are the database's to decide, and guessing at them is how the card on the
  // Train tab ends up disagreeing with the routine it opens.
  return fetchClientRoutine(id);
}

/**
 * The routines list lives on the Train overview, so a save invalidates that
 * rather than a list key of its own — one endpoint, one query, as everywhere.
 */
export function useSaveClientRoutineMutation(): UseMutationResult<
  ApiRoutineInstance,
  Error,
  SaveClientRoutineInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveClientRoutine,
    onSuccess: (routine) => {
      queryClient.setQueryData(queryKeys.clientRoutines.detail(routine.id), routine);
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.train });
    },
  });
}

async function deleteClientRoutine(routineId: string): Promise<void> {
  if (env.useMocks) {
    mockDeleteRoutineInstance(routineId);
    await mockDelay(undefined, 250);
    return;
  }
  // Blocks, sessions and any pending proposal go with it — every child table
  // cascades off the instance.
  assertOk(await supabase.from('routine_instances').delete().eq('id', routineId));
}

export function useDeleteClientRoutineMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClientRoutine,
    onSuccess: (_data, routineId) => {
      queryClient.removeQueries({ queryKey: queryKeys.clientRoutines.detail(routineId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.train });
    },
  });
}

async function deleteAllClientRoutines(): Promise<void> {
  if (env.useMocks) {
    mockDeleteOwnRoutines();
    await mockDelay(undefined, 300);
    return;
  }
  // `program_routine_id is null` is what "their own" means. RLS already scopes
  // this to the caller, so the filter is about which of *their* routines go,
  // not about whose.
  assertOk(
    await supabase.from('routine_instances').delete().is('program_routine_id', null),
  );
}

/**
 * Clears the client's own routines and nothing else — a coach's routine is
 * not the client's to delete, so this never touches one.
 */
export function useDeleteAllClientRoutinesMutation(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllClientRoutines,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['client', 'routines'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.train });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The second gate. A coach's published change arrives as a proposal on
 * each copy; nothing moves until the person holding it decides. See
 * `ApiRoutineUpdate`.
 * ------------------------------------------------------------------ */

export interface DecideUpdateInput {
  readonly routineId: string;
  readonly accept: boolean;
}

async function decideUpdate({ routineId, accept }: DecideUpdateInput): Promise<void> {
  if (env.useMocks) {
    if (accept) mockAcceptUpdate(routineId);
    else mockDeclineUpdate(routineId);
    await mockDelay(undefined, 250);
    return;
  }
  // Accepting swaps in the proposed blocks and puts the copy back in step;
  // declining keeps theirs and marks it diverged. Either way the proposal is
  // spent — a decision, not a deferral.
  assertOk(
    await supabase.rpc('decide_routine_update', {
      p_routine_instance_id: routineId,
      p_accept: accept,
    }),
  );
}

export function useDecideRoutineUpdateMutation(): UseMutationResult<
  void,
  Error,
  DecideUpdateInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: decideUpdate,
    onSuccess: (_data, { routineId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientRoutines.detail(routineId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.train });
    },
  });
}
