import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockDelay } from './mocks';
import type { ApiAuthResult, ApiCoachSummary, UserRole } from './types';

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

async function postLogin(input: LoginInput): Promise<ApiAuthResult> {
  if (env.useMocks) {
    // Role comes from the address so both sides of the app are reachable
    // without a code change: anything containing "coach" signs in as a coach,
    // everything else as a client. A real backend returns the stored role.
    const isCoach = input.email.toLowerCase().includes('coach');
    return mockDelay({
      token: 'mock-token',
      user: isCoach
        ? { id: 'user-1', name: 'Damilare A.', email: input.email, role: 'coach', avatarUrl: null }
        : { id: 'user-2', name: 'Maya Andersson', email: input.email, role: 'client', avatarUrl: null },
    });
  }
  const { data } = await client.post<ApiAuthResult>('/auth/login', input);
  return data;
}

export interface SignupInput {
  readonly role: UserRole;
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

async function postSignup(input: SignupInput): Promise<ApiAuthResult> {
  if (env.useMocks) {
    return mockDelay({
      token: 'mock-token',
      user: {
        id: 'user-new',
        name: input.name,
        email: input.email,
        role: input.role,
        avatarUrl: null,
      },
    });
  }
  const { data } = await client.post<ApiAuthResult>('/auth/signup', input);
  return data;
}

const mockLookedUpCoach: ApiCoachSummary = {
  id: 'coach-sam',
  name: 'Sam Okafor',
  initials: 'SO',
  headline: 'Strength coach · 18 clients · Berlin',
};

async function postLookupCoach(code: string): Promise<ApiCoachSummary> {
  if (env.useMocks) {
    if (code.trim().length === 0) {
      throw new Error('Enter an invite code.');
    }
    return mockDelay(mockLookedUpCoach);
  }
  const { data } = await client.post<ApiCoachSummary>('/auth/coach-lookup', { code });
  return data;
}

export interface AttachCoachInput {
  readonly coachId: string;
  readonly permissions: {
    readonly workouts: boolean;
    readonly nutrition: boolean;
    readonly metrics: boolean;
  };
  readonly logFor: boolean;
}

async function postAttachCoach(input: AttachCoachInput): Promise<void> {
  if (env.useMocks) {
    return mockDelay(undefined);
  }
  await client.post('/auth/attach-coach', input);
}

export function useLoginMutation(): UseMutationResult<ApiAuthResult, Error, LoginInput> {
  return useMutation({ mutationFn: postLogin });
}

export function useSignupMutation(): UseMutationResult<ApiAuthResult, Error, SignupInput> {
  return useMutation({ mutationFn: postSignup });
}

export function useLookupCoachMutation(): UseMutationResult<ApiCoachSummary, Error, string> {
  return useMutation({ mutationFn: postLookupCoach });
}

export function useAttachCoachMutation(): UseMutationResult<void, Error, AttachCoachInput> {
  return useMutation({ mutationFn: postAttachCoach });
}
