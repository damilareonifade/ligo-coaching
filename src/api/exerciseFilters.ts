import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { mockDelay, mockExerciseFilterOptions } from './mocks';
import { queryKeys } from './queryKeys';
import { supabase, unwrap } from './supabase';
import type { ApiExerciseFilterOption } from './types';

/* ------------------------------------------------------------------ *
 * What the picker can be narrowed by.
 *
 * Read from the catalogue rather than written into the app, because
 * the vocabulary is WorkoutX's: "Upper Legs" and "Waist" are their
 * body parts, "Ez Barbell" their equipment. A list in the app would be
 * a second opinion that drifts the first time they add one.
 * ------------------------------------------------------------------ */

async function fetchExerciseFilterOptions(): Promise<readonly ApiExerciseFilterOption[]> {
  if (env.useMocks) {
    return mockDelay(mockExerciseFilterOptions(), 150);
  }

  const rows = unwrap(await supabase.rpc('exercise_filter_options'));
  return rows.map((row) => ({
    kind: row.kind === 'equipment' ? 'equipment' : 'body_part',
    value: row.value,
    label: row.label,
    count: row.count,
  }));
}

export function useExerciseFilterOptionsQuery(): UseQueryResult<
  readonly ApiExerciseFilterOption[],
  Error
> {
  return useQuery({
    queryKey: queryKeys.exerciseFilterOptions,
    queryFn: fetchExerciseFilterOptions,
    // The catalogue changes monthly at most, and these are the chips above a
    // list somebody is typing into — refetching them mid-search would move
    // the row under their thumb.
    staleTime: 1000 * 60 * 60,
  });
}
