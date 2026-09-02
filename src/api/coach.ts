import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockCoach, mockDelay } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiCoach } from './types';

async function fetchCoach(): Promise<ApiCoach> {
  if (env.useMocks) return mockDelay(mockCoach);
  const { data } = await client.get<ApiCoach>('/me');
  return data;
}

export function useCoachQuery(): UseQueryResult<ApiCoach, Error> {
  return useQuery({ queryKey: queryKeys.coach, queryFn: fetchCoach });
}
