import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockCoach, mockDelay } from './mocks';
import type { ApiAuthResult } from './types';

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

async function postLogin(input: LoginInput): Promise<ApiAuthResult> {
  if (env.useMocks) {
    return mockDelay({ token: 'mock-token', coach: { ...mockCoach, email: input.email } });
  }
  const { data } = await client.post<ApiAuthResult>('/auth/login', input);
  return data;
}

export interface RegisterInput extends LoginInput {
  readonly name: string;
  readonly gymName: string;
}

async function postRegister(input: RegisterInput): Promise<ApiAuthResult> {
  if (env.useMocks) {
    return mockDelay({
      token: 'mock-token',
      coach: { ...mockCoach, name: input.name, email: input.email, gymName: input.gymName },
    });
  }
  const { data } = await client.post<ApiAuthResult>('/auth/register', input);
  return data;
}

export function useLoginMutation(): UseMutationResult<ApiAuthResult, Error, LoginInput> {
  return useMutation({ mutationFn: postLogin });
}

export function useRegisterMutation(): UseMutationResult<ApiAuthResult, Error, RegisterInput> {
  return useMutation({ mutationFn: postRegister });
}
