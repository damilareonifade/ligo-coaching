import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockDelay, mockSessions } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiSession, ApiSetLog } from './types';

async function fetchTodaySessions(): Promise<readonly ApiSession[]> {
  if (env.useMocks) {
    const today = new Date().toDateString();
    return mockDelay(
      mockSessions.filter((session) => new Date(session.scheduledAt).toDateString() === today),
    );
  }
  const { data } = await client.get<ApiSession[]>('/sessions', { params: { window: 'today' } });
  return data;
}

export function useTodaySessionsQuery(): UseQueryResult<readonly ApiSession[], Error> {
  return useQuery({ queryKey: queryKeys.sessions.today, queryFn: fetchTodaySessions });
}

export interface LogSetInput {
  readonly sessionId: string;
  readonly set: ApiSetLog;
}

async function postSetLog({ sessionId, set }: LogSetInput): Promise<void> {
  if (env.useMocks) {
    await mockDelay(undefined, 200);
    return;
  }
  await client.post(`/sessions/${sessionId}/sets`, set);
}

/**
 * Logging a set must feel instant — a coach taps this mid-rep, often on gym
 * wifi. The set count moves in the cache first and rolls back if the write fails.
 */
export function useLogSetMutation(): UseMutationResult<void, Error, LogSetInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postSetLog,
    onMutate: async ({ sessionId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions.today });
      const previous = queryClient.getQueryData<readonly ApiSession[]>(queryKeys.sessions.today);

      queryClient.setQueryData<readonly ApiSession[]>(queryKeys.sessions.today, (current) =>
        current?.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                completedSets: Math.min(session.completedSets + 1, session.totalSets),
                status:
                  session.completedSets + 1 >= session.totalSets
                    ? ('completed' as const)
                    : session.status,
              }
            : session,
        ),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.sessions.today, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.today });
    },
  });
}
