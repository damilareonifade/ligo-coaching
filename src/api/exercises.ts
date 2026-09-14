import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { exerciseGifUrl } from '@/lib/exerciseGif';

import { mockDelay, mockExercisePreview } from './mocks';
import { queryKeys } from './queryKeys';
import { supabase } from './supabase';
import type { ApiExercisePreview } from './types';

/* ------------------------------------------------------------------ *
 * What an exercise actually is.
 *
 * Asked from four places that each hold something different: the picker
 * holds a catalogue id, a routine block holds an id *and* a name, a
 * logged exercise holds whatever the client's copy is called. The RPC
 * takes both and prefers the id, so no caller has to know which of the
 * two it is entitled to trust.
 * ------------------------------------------------------------------ */

export interface ExercisePreviewInput {
  /** The recorded catalogue link. Preferred whenever it exists. */
  readonly exerciseId?: string | null;
  /** The fallback, for rows written before the link existed or typed by hand. */
  readonly name?: string | null;
}

async function fetchExercisePreview({
  exerciseId,
  name,
}: ExercisePreviewInput): Promise<ApiExercisePreview | null> {
  if (env.useMocks) {
    return mockDelay(mockExercisePreview(name ?? ''), 150);
  }

  // Blank-guarded, not just null-guarded: `''` is a valid string and an
  // invalid uuid, and Postgres fails the statement rather than ignoring it.
  const id = exerciseId && exerciseId.trim().length > 0 ? exerciseId : undefined;
  const label = name && name.trim().length > 0 ? name : undefined;

  const { data, error } = await supabase.rpc('exercise_preview', {
    p_exercise_id: id,
    p_name: label,
  });

  if (__DEV__) {
    // The preview is three lookups deep — a block's link, a catalogue row, a
    // stored animation — and when one of them comes back empty the screen
    // just says there is no animation. This says which.
    console.log('[exercise] preview', {
      askedId: id ?? null,
      askedName: label ?? null,
      error: error?.message ?? null,
      found: data?.[0]?.name ?? null,
      gifPath: data?.[0]?.gif_path ?? null,
      externalId: data?.[0]?.external_id ?? null,
    });
  }

  // An exercise somebody invented has no catalogue entry, and that is an
  // answer rather than a failure — the screen says so instead of erroring.
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    gifUrl: exerciseGifUrl(row.gif_path),
    // Present only for a catalogue entry, and the signal that its animation
    // can be fetched. An exercise somebody typed has none.
    externalId: row.external_id,
    bodyPart: row.body_part,
    target: row.target,
    equipment: row.equipment,
    secondaryMuscles: row.secondary_muscles ?? [],
    instructions: row.instructions ?? [],
    difficulty: row.difficulty,
  };
}

export function useExercisePreviewQuery(
  input: ExercisePreviewInput,
): UseQueryResult<ApiExercisePreview | null, Error> {
  const enabled = Boolean(input.exerciseId || input.name);

  return useQuery({
    queryKey: queryKeys.exercisePreview(input.exerciseId ?? null, input.name ?? null),
    queryFn: () => fetchExercisePreview(input),
    enabled,
    // The catalogue changes monthly at most, so this is worth holding on to —
    // a client reopening the same preview mid-workout should not wait twice.
    staleTime: 1000 * 60 * 60,
  });
}

/* ------------------------------------------------------------------ *
 * Warming one animation.
 *
 * The first person to open an exercise pays for the fetch — a second
 * or so — and nobody pays again. Which is why this is a mutation the
 * screen fires rather than something the import does 1,400 times up
 * front: most of the catalogue will never be opened, and the ones that
 * are get opened constantly.
 * ------------------------------------------------------------------ */

async function postCacheGif(exerciseId: string): Promise<void> {
  if (env.useMocks) {
    await mockDelay(undefined, 200);
    return;
  }

  const { data, error } = await supabase.functions.invoke('cache-exercise-gif', {
    body: { exerciseId },
  });

  if (__DEV__) {
    // The function's own body carries the useful part — a quota number, or
    // which of the three ways it can decline. `error.message` alone is
    // "Edge Function returned a non-2xx status code", which says nothing.
    console.log('[exercise] cache gif', { exerciseId, data, error: error?.message ?? null });
  }

  // Deliberately quiet on screen. A failure here means the preview shows
  // everything except the animation, which is most of it, and a toast would
  // interrupt somebody mid-set to report something they did not ask for.
  if (error) throw new Error(error.message);
}

export function useCacheExerciseGifMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCacheGif,
    onSuccess: () => {
      // Refetch the preview, which now has a path to build a URL from.
      void queryClient.invalidateQueries({ queryKey: ['exercise-preview'] });
    },
  });
}
