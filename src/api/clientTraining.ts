import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import {
  mockApplyClientSet,
  mockClientSession,
  mockClientToday,
  mockDelay,
  mockFinishClientSession,
  mockTrainOverview,
} from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiClientSession, ApiClientToday, ApiSessionSet, ApiTrainOverview } from './types';

async function fetchClientToday(): Promise<ApiClientToday> {
  if (env.useMocks) {
    return mockDelay(mockClientToday());
  }
  const { data } = await client.get<ApiClientToday>('/client/today');
  return data;
}

export function useClientTodayQuery(): UseQueryResult<ApiClientToday, Error> {
  return useQuery({ queryKey: queryKeys.clientTraining.today, queryFn: fetchClientToday });
}

async function fetchTrainOverview(): Promise<ApiTrainOverview> {
  if (env.useMocks) {
    return mockDelay(mockTrainOverview);
  }
  const { data } = await client.get<ApiTrainOverview>('/client/train');
  return data;
}

export function useTrainOverviewQuery(): UseQueryResult<ApiTrainOverview, Error> {
  return useQuery({ queryKey: queryKeys.clientTraining.train, queryFn: fetchTrainOverview });
}

async function fetchClientSession(sessionId: string): Promise<ApiClientSession> {
  if (env.useMocks) {
    return mockDelay(mockClientSession(sessionId));
  }
  const { data } = await client.get<ApiClientSession>(`/client/sessions/${sessionId}`);
  return data;
}

export function useClientSessionQuery(sessionId: string): UseQueryResult<ApiClientSession, Error> {
  return useQuery({
    queryKey: queryKeys.clientTraining.session(sessionId),
    queryFn: () => fetchClientSession(sessionId),
    enabled: sessionId.length > 0,
  });
}

export interface StartSessionInput {
  readonly planId: string;
}

async function postStartSession({ planId }: StartSessionInput): Promise<ApiClientSession> {
  if (env.useMocks) {
    return mockDelay(mockClientSession(`ses-${planId}-${Date.now()}`));
  }
  const { data } = await client.post<ApiClientSession>('/client/sessions', { planId });
  return data;
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
  await client.post(`/client/sessions/${sessionId}/sets`, { exerciseId, ...set });
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
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      sets: exercise.sets.map((existing) =>
                        existing.n === set.n ? set : existing,
                      ),
                    }
                  : exercise,
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

export interface FinishSessionInput {
  readonly sessionId: string;
}

async function postFinishSession({ sessionId }: FinishSessionInput): Promise<void> {
  if (env.useMocks) {
    mockFinishClientSession(sessionId);
    await mockDelay(undefined, 300);
    return;
  }
  await client.post(`/client/sessions/${sessionId}/finish`);
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
