import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { assignedLabel } from '@/lib/programs';

import { ApiError } from './client';
import {
  mockCreateExercise,
  mockDelay,
  mockExerciseOptions,
  mockProgramDetail,
  mockProgramLibrary,
  mockPublishProgram,
  mockAssignProgram,
  mockUnassignProgram,
  mockProposeUpdate,
  mockPublishImpact,
  mockSaveProgram,
} from './mocks';
import { queryKeys } from './queryKeys';
import {
  PROGRAM_SELECT,
  toExerciseOption,
  toProgramDetail,
  toProgramSummary,
} from './rows';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type {
  ApiExerciseOption,
  ApiProgramRoutine,
  ApiProgramDetail,
  ApiProgramSummary,
  BuilderKind,
} from './types';

/* ------------------------------------------------------------------ *
 * The coach's program library and editor. Separate from `api/programs`
 * (the student-detail read) on purpose: this module owns days, blocks
 * and the publish state, and it is the only place that writes them.
 * ------------------------------------------------------------------ */

async function fetchLibrary(): Promise<readonly ApiProgramSummary[]> {
  if (env.useMocks) {
    return mockDelay(mockProgramLibrary());
  }

  // Most recently touched first: the library is a working surface, not an
  // archive, and the program a coach just edited is the one they are on.
  const rows = unwrap(
    await supabase.from('programs').select(PROGRAM_SELECT).order('updated_at', {
      ascending: false,
    }),
  );
  return rows.map(toProgramSummary);
}

export function useProgramLibraryQuery(): UseQueryResult<readonly ApiProgramSummary[], Error> {
  return useQuery({ queryKey: queryKeys.coachPrograms.library, queryFn: fetchLibrary });
}

async function fetchProgramDetail(id: string): Promise<ApiProgramDetail> {
  if (env.useMocks) {
    const program = mockProgramDetail(id);
    if (!program) throw new ApiError('That program no longer exists.', 404);
    return mockDelay(program);
  }
  const { data, error, status } = await supabase
    .from('programs')
    .select(PROGRAM_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  if (!data) throw new ApiError('That program no longer exists.', 404);
  return toProgramDetail(data);
}

export function useProgramDetailQuery(id: string): UseQueryResult<ApiProgramDetail, Error> {
  return useQuery({
    queryKey: queryKeys.coachPrograms.detail(id),
    queryFn: () => fetchProgramDetail(id),
    enabled: id.length > 0,
  });
}

/* ------------------------------------------------------------------ *
 * Saving. A save is never a publish — see the note the library screen
 * shows the coach — so every write lands as draft changes and waits.
 * ------------------------------------------------------------------ */

export interface SaveProgramInput {
  /** Present for an edit, absent for a new program or routine. */
  readonly id?: string;
  readonly name: string;
  /** Free text about the program or routine. `null` clears it. */
  readonly note: string | null;
  readonly kind: BuilderKind;
  /** How often the client should train. A routine is one session, so 1. */
  readonly sessionsPerWeek: number;
  /** Ignored for a routine, which is a single day with no week count. */
  readonly weeks: number;
  readonly routines: readonly ApiProgramRoutine[];
}

function composeMeta(input: SaveProgramInput): string {
  if (input.kind === 'routine') {
    const count = input.routines[0]?.blocks.length ?? 0;
    return `Routine · ${count} ${count === 1 ? 'exercise' : 'exercises'}`;
  }
  const count = input.routines.length;
  return `${input.weeks} weeks · ${count} ${count === 1 ? 'routine' : 'routines'}`;
}

/**
 * Composed in one place so the card that appears optimistically is the card the
 * refetch hands back, rather than one that visibly rewrites itself a beat later.
 * An edit keeps the program's own meta — the focus line ("Upper/Lower") is the
 * coach's wording and cannot be recovered from the fields the builder holds.
 */
export function composeProgram(
  input: SaveProgramInput,
  existing: ApiProgramDetail | null,
): ApiProgramDetail {
  const assignedIds = existing?.assignedIds ?? [];

  return {
    id: existing?.id ?? input.id ?? `pg-${Date.now()}`,
    name: input.name.trim(),
    // An emptied box clears the note rather than saving a blank one.
    note: input.note?.trim() ? input.note.trim() : null,
    meta: existing?.meta ?? composeMeta(input),
    // Any edit is ahead of what clients hold, so it reads as a draft until
    // it is published — including an edit to something already published.
    status: 'draft',
    statusLabel: 'Draft changes',
    assignedIds,
    assignedLabel: assignedLabel(assignedIds.length),
    weeks: input.kind === 'routine' ? 1 : input.weeks,
    sessionsPerWeek: input.kind === 'routine' ? 1 : input.sessionsPerWeek,
    routines: input.routines,
    hasDraftChanges: true,
  };
}


export interface AssignProgramInput {
  readonly programId: string;
  /** Who should hold this program after the call — the whole set, not a delta. */
  readonly clientIds: readonly string[];
  /** Who holds it now, so the call can work out what changed. */
  readonly currentIds: readonly string[];
}

async function assignProgram({
  programId,
  clientIds,
  currentIds,
}: AssignProgramInput): Promise<void> {
  const added = clientIds.filter((id) => !currentIds.includes(id));
  const removed = currentIds.filter((id) => !clientIds.includes(id));

  if (env.useMocks) {
    if (removed.length > 0) mockUnassignProgram(programId, removed);
    if (added.length > 0) mockAssignProgram(programId, added);
    await mockDelay(undefined, 300);
    return;
  }

  // Two calls rather than one of the whole set: giving someone a copy and
  // taking one away are different acts, and taking one away destroys work the
  // client may have done on it.
  //
  // Unassign first, so a client moved off and back on in the same edit ends up
  // with a fresh copy rather than their old one — which is what the coach who
  // just unticked and reticked them meant.
  if (removed.length > 0) {
    unwrap(
      await supabase.rpc('unassign_program', {
        p_program_id: programId,
        p_client_ids: [...removed],
      }),
    );
  }
  if (added.length > 0) {
    unwrap(
      await supabase.rpc('assign_program', {
        p_program_id: programId,
        p_client_ids: [...added],
      }),
    );
  }
}

/**
 * Sets who holds a program. Assigning gives each client their own copy — see
 * `ApiRoutineInstance` — and unassigning takes that copy back, along with
 * whatever they had changed on it.
 *
 * Takes the whole intended set rather than a delta so the screen can be a list
 * of checkboxes; the diff happens here, once, where both halves are visible.
 */
export function useAssignProgramMutation(): UseMutationResult<void, Error, AssignProgramInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignProgram,
    onSuccess: (_data, { programId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachPrograms.detail(programId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachPrograms.library });
      // The client's Train tab lists instances, so a new one belongs there.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.train });
    },
  });
}

/** Returns the saved program so a new one's id is known to its caller. */
async function saveProgram(input: SaveProgramInput): Promise<ApiProgramDetail> {
  if (env.useMocks) {
    const program = composeProgram(input, input.id ? mockProgramDetail(input.id) : null);
    mockSaveProgram(program);
    return mockDelay(program, 250);
  }
  // A program is a row, its routines and every exercise inside each of them,
  // so the save is one transaction or it is a program half-written.
  const id = unwrap(
    await supabase.rpc('save_program', {
      p_name: input.name.trim(),
      p_note: input.note?.trim() ? input.note.trim() : null,
      // A routine is a single session with no week count — the builder says so
      // by its kind, and the database has only the numbers.
      p_weeks: input.kind === 'routine' ? 1 : input.weeks,
      p_sessions_per_week: input.kind === 'routine' ? 1 : input.sessionsPerWeek,
      p_routines: input.routines.map((routine, index) => ({
        name: routine.name,
        // Position is the identity: `save_program` matches routines by it and
        // keeps the row, so every client already holding a copy stays linked
        // through a rename. The builder's own ids are positional too and never
        // reach the database.
        order_index: index,
        blocks: routine.blocks.map((block, blockIndex) => ({
          name: block.name,
          scheme: block.scheme,
          rpe: block.rpe,
          target_kg: block.targetKg ?? null,
          note: block.note,
          order_index: blockIndex,
        })),
      })),
      p_program_id: input.id,
    }),
  );

  // Read it back: `meta`, the status chip and who holds it are all derived
  // from rows the save has just moved, and guessing at them here is how the
  // card that appears differs from the card the refetch hands back.
  return fetchProgramDetail(id);
}

function upsertSummary(
  library: readonly ApiProgramSummary[],
  program: ApiProgramDetail,
): readonly ApiProgramSummary[] {
  const summary: ApiProgramSummary = {
    id: program.id,
    name: program.name,
    meta: program.meta,
    status: program.status,
    statusLabel: program.statusLabel,
    assignedIds: program.assignedIds,
    assignedLabel: program.assignedLabel,
  };
  const exists = library.some((entry) => entry.id === program.id);

  return exists
    ? library.map((entry) => (entry.id === program.id ? summary : entry))
    : [summary, ...library];
}

/**
 * The builder closes on save and the picker goes straight back to the day it
 * came from, so both destinations have to already carry the change — landing
 * on a list that has not moved reads as a lost program.
 */
export function useSaveProgramMutation(): UseMutationResult<
  ApiProgramDetail,
  Error,
  SaveProgramInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveProgram,
    onMutate: async (input) => {
      const libraryKey = queryKeys.coachPrograms.library;
      await queryClient.cancelQueries({ queryKey: libraryKey });

      const previousLibrary = queryClient.getQueryData<readonly ApiProgramSummary[]>(libraryKey);
      const existing = input.id
        ? (queryClient.getQueryData<ApiProgramDetail>(
            queryKeys.coachPrograms.detail(input.id),
          ) ?? null)
        : null;
      const program = composeProgram(input, existing);
      const detailKey = queryKeys.coachPrograms.detail(program.id);
      const previousDetail = queryClient.getQueryData<ApiProgramDetail>(detailKey);

      queryClient.setQueryData<readonly ApiProgramSummary[]>(libraryKey, (current) =>
        current ? upsertSummary(current, program) : current,
      );
      // The detail cache too, not only the library: the picker adds a block and
      // pops back to the program it was adding to, which reads this key.
      queryClient.setQueryData<ApiProgramDetail>(detailKey, (current) =>
        current ? program : current,
      );

      return { previousLibrary, libraryKey, previousDetail, detailKey };
    },
    onError: (_error, _input, context) => {
      if (!context) return;
      if (context.previousLibrary) {
        queryClient.setQueryData(context.libraryKey, context.previousLibrary);
      }
      if (context.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
    },
    onSettled: (_data, _error, _input, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachPrograms.library });
      if (context?.detailKey) {
        void queryClient.invalidateQueries({ queryKey: context.detailKey });
      }
    },
  });
}

/* ------------------------------------------------------------------ *
 * Publishing. This is the moment a client gets a copy they own, so the
 * button has to settle instantly — a coach who taps twice must not send
 * the same program out twice.
 * ------------------------------------------------------------------ */

async function postPublish(id: string): Promise<void> {
  if (env.useMocks) {
    mockProposeUpdate(id);
    mockPublishProgram(id);
    await mockDelay(undefined, 250);
    return;
  }
  // Publishing proposes; it never overwrites. Every holder is asked, including
  // one whose copy still matches — it is their copy either way.
  unwrap(await supabase.rpc('publish_program', { p_program_id: id }));
}

export interface ApiPublishImpact {
  /** Clients holding a copy of this template. */
  readonly holders: number;
  /** How many of those have changed theirs — the ones a publish collides with. */
  readonly changed: number;
}

async function fetchPublishImpact(programId: string): Promise<ApiPublishImpact> {
  if (env.useMocks) {
    return mockDelay(mockPublishImpact(programId), 150);
  }
  // Counted in clients, not copies: a four-routine program assigned to one
  // person is one holder about to be asked, not four. The rows are one per
  // copy, so the distinct count happens here — `count(distinct …)` is not
  // something PostgREST can be asked for.
  const rows = unwrap(
    await supabase
      .from('routine_instances')
      .select('client_id, diverged, program_routines!inner(program_id)')
      .eq('program_routines.program_id', programId),
  );

  const holders = new Set(rows.map((row) => row.client_id));
  const changed = new Set(
    rows.filter((row) => row.diverged).map((row) => row.client_id),
  );

  return { holders: holders.size, changed: changed.size };
}

/**
 * What publishing would reach, for the coach to see before they send it.
 *
 * Publishing does not overwrite anybody — it asks each holder — so this is not
 * a warning so much as a plain account of who is about to be asked.
 */
export function usePublishImpactQuery(
  programId: string,
  enabled: boolean,
): UseQueryResult<ApiPublishImpact, Error> {
  return useQuery({
    queryKey: queryKeys.coachPrograms.publishImpact(programId),
    queryFn: () => fetchPublishImpact(programId),
    enabled: enabled && programId.length > 0,
  });
}

export function usePublishProgramMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postPublish,
    onMutate: async (id) => {
      const libraryKey = queryKeys.coachPrograms.library;
      const detailKey = queryKeys.coachPrograms.detail(id);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: libraryKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);

      const previousLibrary = queryClient.getQueryData<readonly ApiProgramSummary[]>(libraryKey);
      const previousDetail = queryClient.getQueryData<ApiProgramDetail>(detailKey);

      queryClient.setQueryData<readonly ApiProgramSummary[]>(libraryKey, (current) =>
        current?.map((entry) =>
          entry.id === id
            ? { ...entry, status: 'published', statusLabel: 'Published' }
            : entry,
        ),
      );
      queryClient.setQueryData<ApiProgramDetail>(detailKey, (current) =>
        current
          ? { ...current, status: 'published', statusLabel: 'Published', hasDraftChanges: false }
          : current,
      );

      return { previousLibrary, libraryKey, previousDetail, detailKey };
    },
    onError: (_error, _id, context) => {
      if (!context) return;
      if (context.previousLibrary) {
        queryClient.setQueryData(context.libraryKey, context.previousLibrary);
      }
      if (context.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
    },
    onSettled: (_data, _error, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachPrograms.library });
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachPrograms.detail(id) });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The exercise catalogue behind the picker.
 * ------------------------------------------------------------------ */

async function fetchExerciseOptions(
  query: string,
  filter: string,
): Promise<readonly ApiExerciseOption[]> {
  if (env.useMocks) {
    return mockDelay(mockExerciseOptions(query, filter), 200);
  }
  const coachId = await currentUserId();

  // Filtered in the database rather than by pulling the catalogue down and
  // sieving it on the phone — this runs on every keystroke, and the shared
  // library only grows.
  let request = supabase
    .from('exercises')
    .select('*')
    // A coach's own first: they added it to use it, and it must not be three
    // sections down.
    .order('owner_id', { ascending: false, nullsFirst: false })
    .order('name');

  if (filter === 'recent' || filter === 'yours') {
    request = request.eq('owner_id', coachId);
  } else if (filter === 'compound' || filter === 'accessory') {
    request = request.ilike('tag', filter);
  }

  if (query.length > 0) {
    // The placeholder promises equipment and muscle are searchable too, and
    // `meta` is where both of those are written.
    const needle = `%${query.replaceAll('%', '').replaceAll(',', '')}%`;
    request = request.or(`name.ilike.${needle},meta.ilike.${needle}`);
  }

  const rows = unwrap(await request);
  return rows.map((row) =>
    // A coach's own exercise sits under Recent; everything else files under
    // the muscle it trains.
    toExerciseOption(row, row.owner_id === coachId ? 'Recent' : row.muscle_group),
  );
}

/**
 * Unlike food search this runs on an empty box: the picker opens onto the whole
 * catalogue, because a coach browses for an exercise as often as they name one.
 */
export function useExerciseOptionsQuery(
  query: string,
  filter: string,
): UseQueryResult<readonly ApiExerciseOption[], Error> {
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.coachPrograms.exercises(trimmed, filter),
    queryFn: () => fetchExerciseOptions(trimmed, filter),
  });
}

export interface CreateExerciseInput {
  readonly name: string;
  readonly muscle: string;
  readonly equipment: string;
  /** What the client logs against it — "Weight × reps", "Time"… */
  readonly tracks: string;
  /** The one thing to remember. Empty when the coach left it blank. */
  readonly note: string;
}

async function postCreateExercise(input: CreateExerciseInput): Promise<void> {
  if (env.useMocks) {
    mockCreateExercise({ name: input.name, muscle: input.muscle, equipment: input.equipment });
    await mockDelay(undefined, 250);
    return;
  }
  assertOk(
    await supabase.from('exercises').insert({
      // Owned, so it is theirs to edit and nobody else's to see — the shared
      // library is the rows with no owner.
      owner_id: await currentUserId(),
      name: input.name.trim(),
      // Pre-composed for the picker row, the same shape the shared library
      // uses: "Barbell · Chest".
      meta: [input.equipment.trim(), input.muscle.trim()].filter(Boolean).join(' · '),
      tag: 'Yours',
      muscle_group: input.muscle.trim() || 'Other',
    }),
  );
}

/**
 * Not optimistic: the coach lands back on the picker, where the new exercise
 * has to appear under a section header with a tag the server assigns. A guessed
 * row that then re-sorts itself is worse than a beat of waiting.
 */
export function useCreateExerciseMutation(): UseMutationResult<void, Error, CreateExerciseInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCreateExercise,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachPrograms.exercisesAll });
    },
  });
}
