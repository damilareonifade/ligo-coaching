import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { assignedLabel } from '@/lib/programs';

import { ApiError, client } from './client';
import {
  mockCreateExercise,
  mockDelay,
  mockExerciseOptions,
  mockProgramDetail,
  mockProgramLibrary,
  mockPublishProgram,
  mockSaveProgram,
} from './mocks';
import { queryKeys } from './queryKeys';
import type {
  ApiExerciseOption,
  ApiProgramDay,
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
  const { data } = await client.get<readonly ApiProgramSummary[]>('/coach/programs');
  return data;
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
  const { data } = await client.get<ApiProgramDetail>(`/coach/programs/${id}`);
  return data;
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
  readonly kind: BuilderKind;
  /** Ignored for a routine, which is a single day with no week count. */
  readonly weeks: number;
  readonly days: readonly ApiProgramDay[];
}

function composeMeta(input: SaveProgramInput): string {
  if (input.kind === 'routine') {
    const count = input.days[0]?.blocks.length ?? 0;
    return `Routine · ${count} ${count === 1 ? 'exercise' : 'exercises'}`;
  }
  const days = input.days.length;
  return `${input.weeks} weeks · ${days} ${days === 1 ? 'day' : 'days'}`;
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
    meta: existing?.meta ?? composeMeta(input),
    // Any edit is ahead of what clients hold, so it reads as a draft until
    // it is published — including an edit to something already published.
    status: 'draft',
    statusLabel: 'Draft changes',
    assignedIds,
    assignedLabel: assignedLabel(assignedIds.length),
    weeks: input.kind === 'routine' ? 1 : input.weeks,
    days: input.days,
    hasDraftChanges: true,
  };
}

async function saveProgram(input: SaveProgramInput): Promise<void> {
  if (env.useMocks) {
    mockSaveProgram(composeProgram(input, input.id ? mockProgramDetail(input.id) : null));
    await mockDelay(undefined, 250);
    return;
  }
  if (input.id) {
    await client.put(`/coach/programs/${input.id}`, input);
    return;
  }
  await client.post('/coach/programs', input);
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
export function useSaveProgramMutation(): UseMutationResult<void, Error, SaveProgramInput> {
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
    mockPublishProgram(id);
    await mockDelay(undefined, 250);
    return;
  }
  await client.post(`/coach/programs/${id}/publish`);
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
  const { data } = await client.get<readonly ApiExerciseOption[]>('/coach/exercises', {
    params: { q: query, filter },
  });
  return data;
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
  await client.post('/coach/exercises', input);
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
