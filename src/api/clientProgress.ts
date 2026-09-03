import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockClientProgress, mockDelay } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiClientProgress } from './types';

async function fetchClientProgress(): Promise<ApiClientProgress> {
  if (env.useMocks) {
    return mockDelay(mockClientProgress);
  }
  const { data } = await client.get<ApiClientProgress>('/client/progress');
  return data;
}

export function useClientProgressQuery(): UseQueryResult<ApiClientProgress, Error> {
  return useQuery({ queryKey: queryKeys.clientProgress, queryFn: fetchClientProgress });
}
