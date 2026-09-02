import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { ApiError, client } from './client';
import { mockDelay, mockPrograms } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiProgram } from './types';

async function fetchPrograms(): Promise<readonly ApiProgram[]> {
  if (env.useMocks) return mockDelay(mockPrograms);
  const { data } = await client.get<ApiProgram[]>('/programs');
  return data;
}

async function fetchProgram(id: string): Promise<ApiProgram> {
  if (env.useMocks) {
    const program = mockPrograms.find((candidate) => candidate.id === id);
    if (!program) throw new ApiError('That program no longer exists.', 404);
    return mockDelay(program);
  }
  const { data } = await client.get<ApiProgram>(`/programs/${id}`);
  return data;
}

export function useProgramsQuery(): UseQueryResult<readonly ApiProgram[], Error> {
  return useQuery({ queryKey: queryKeys.programs.all, queryFn: fetchPrograms });
}

export function useProgramQuery(id: string): UseQueryResult<ApiProgram, Error> {
  return useQuery({
    queryKey: queryKeys.programs.detail(id),
    queryFn: () => fetchProgram(id),
    enabled: id.length > 0,
  });
}
