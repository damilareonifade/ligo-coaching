import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { ApiError, client } from './client';
import { mockDelay, mockStudents, mockVolume } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiStudent, ApiVolumePoint } from './types';

async function fetchStudents(): Promise<readonly ApiStudent[]> {
  if (env.useMocks) return mockDelay(mockStudents);
  const { data } = await client.get<ApiStudent[]>('/students');
  return data;
}

async function fetchStudent(id: string): Promise<ApiStudent> {
  if (env.useMocks) {
    const student = mockStudents.find((candidate) => candidate.id === id);
    if (!student) throw new ApiError('That student is no longer on your roster.', 404);
    return mockDelay(student);
  }
  const { data } = await client.get<ApiStudent>(`/students/${id}`);
  return data;
}

async function fetchStudentVolume(id: string): Promise<readonly ApiVolumePoint[]> {
  if (env.useMocks) return mockDelay(mockVolume(id));
  const { data } = await client.get<ApiVolumePoint[]>(`/students/${id}/volume`);
  return data;
}

export function useStudentsQuery(): UseQueryResult<readonly ApiStudent[], Error> {
  return useQuery({ queryKey: queryKeys.students.all, queryFn: fetchStudents });
}

export function useStudentQuery(id: string): UseQueryResult<ApiStudent, Error> {
  return useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => fetchStudent(id),
    enabled: id.length > 0,
  });
}

export function useStudentVolumeQuery(
  id: string,
): UseQueryResult<readonly ApiVolumePoint[], Error> {
  return useQuery({
    queryKey: queryKeys.students.volume(id),
    queryFn: () => fetchStudentVolume(id),
    enabled: id.length > 0,
  });
}
