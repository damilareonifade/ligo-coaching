import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockCreateFood, mockDelay, mockFoodDay, mockFoodSearch, mockLogFood } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiFoodDay, ApiFoodResult } from './types';

async function fetchFoodDay(): Promise<ApiFoodDay> {
  if (env.useMocks) {
    return mockDelay(mockFoodDay());
  }
  const { data } = await client.get<ApiFoodDay>('/client/food/today');
  return data;
}

export function useFoodDayQuery(): UseQueryResult<ApiFoodDay, Error> {
  return useQuery({ queryKey: queryKeys.clientNutrition.day, queryFn: fetchFoodDay });
}

async function fetchFoodSearch(
  query: string,
  filter: string,
): Promise<readonly ApiFoodResult[]> {
  if (env.useMocks) {
    return mockDelay(mockFoodSearch(query, filter), 200);
  }
  const { data } = await client.get<readonly ApiFoodResult[]>('/client/food/search', {
    params: { q: query, filter },
  });
  return data;
}

/**
 * Search only runs once there is something to search for — an empty box must
 * never cost a request, and the results list reads the disabled query's
 * `isPending` as "waiting for you to type", not "loading".
 */
export function useFoodSearchQuery(
  query: string,
  filter: string,
): UseQueryResult<readonly ApiFoodResult[], Error> {
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.clientNutrition.search(trimmed, filter),
    queryFn: () => fetchFoodSearch(trimmed, filter),
    enabled: trimmed.length > 0,
  });
}

export interface LogFoodInput {
  readonly foodId: string;
  readonly name: string;
  readonly kcal: number;
  /**
   * Serving line for the optimistic row only. The real API composes its own
   * from the food record, so it is deliberately not part of the request body.
   */
  readonly meta?: string;
}

async function postLogFood({ foodId, name, kcal }: LogFoodInput): Promise<void> {
  if (env.useMocks) {
    mockLogFood({ foodId, name, kcal });
    await mockDelay(undefined, 200);
    return;
  }
  await client.post('/client/food/log', { foodId, name, kcal });
}

/**
 * Logging food has to land instantly — this is tapped one-handed, mid-meal.
 * The row and the calorie ring move first and roll back if the write fails.
 */
export function useLogFoodMutation(): UseMutationResult<void, Error, LogFoodInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postLogFood,
    onMutate: async ({ foodId, name, kcal, meta }) => {
      const key = queryKeys.clientNutrition.day;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiFoodDay>(key);

      queryClient.setQueryData<ApiFoodDay>(key, (current) =>
        current
          ? {
              ...current,
              kcalConsumed: current.kcalConsumed + kcal,
              logged: [
                ...current.logged,
                {
                  id: `optimistic-${foodId}-${Date.now()}`,
                  name,
                  meta: meta ?? '1 serving · just now',
                  kcal,
                  loggedBy: 'you',
                },
              ],
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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientNutrition.day });
    },
  });
}

export interface CreateFoodInput {
  readonly name: string;
  readonly brand: string;
  readonly servingLabel: string;
  readonly kcal: number;
  readonly protein: number;
  readonly carbs: number;
  readonly fat: number;
  /** Keep it in the client's own food list, or use it once and forget it. */
  readonly save: boolean;
}

async function postCreateFood(input: CreateFoodInput): Promise<void> {
  if (env.useMocks) {
    mockCreateFood(input);
    await mockDelay(undefined, 250);
    return;
  }
  await client.post('/client/food', input);
}

export function useCreateFoodMutation(): UseMutationResult<void, Error, CreateFoodInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCreateFood,
    // A new food lands on today's log, so the day summary is now stale.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientNutrition.day });
    },
  });
}
