/**
 * Email/password auth, against Supabase.
 *
 * Unlike the data modules, nothing here branches on `env.useMocks`: signing in
 * is a real round trip either way, and a mock session would hand the app a
 * token no Supabase table would accept. The coach-lookup and attach-coach
 * calls below are still mocked — they need roster tables that do not exist
 * yet. Google sign-in lives in src/api/googleAuth.ts.
 */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { ApiError, client } from './client';
import { mockDelay } from './mocks';
import { supabase } from './supabase';
import type {
  ApiAuthResult,
  ApiCoachSummary,
  ApiProfile,
  ApiSignupResult,
  UserRole,
} from './types';
import { fetchOwnProfile, sessionUserFromProfile } from './users';

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

async function postLogin(input: LoginInput): Promise<ApiAuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) throw new ApiError(error.message, error.status ?? null);

  const session = data.session;
  if (!session) throw new ApiError('Sign-in did not return a session.', null);

  // The role comes from `public.users`, never from the JWT's user metadata:
  // metadata is client-writable and must not decide which app someone sees.
  const profile = await fetchOwnProfile();
  return { token: session.access_token, user: sessionUserFromProfile(profile) };
}

export interface SignupInput {
  readonly role: UserRole;
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

/**
 * Creates the account.
 *
 * `options.data` lands in `auth.users.raw_user_meta_data`, which the signup
 * trigger reads to build the `public.users` row — so the role chosen on the
 * previous screen is what the profile is created with, already confirmed.
 *
 * When the project requires email confirmation (Authentication → Providers →
 * Email → Confirm email, which is on for this project), Supabase returns a
 * user but no session. That is not a failure, and the caller must not route
 * into the app: see `ApiSignupResult`.
 */
async function postSignup(input: SignupInput): Promise<ApiSignupResult> {
  const email = input.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { role: input.role, full_name: input.name.trim() } },
  });
  if (error) throw new ApiError(error.message, error.status ?? null);

  if (!data.session) {
    return { status: 'confirmation-required', email };
  }

  const profile: ApiProfile = await fetchOwnProfile();
  return {
    status: 'signed-in',
    session: { token: data.session.access_token, user: sessionUserFromProfile(profile) },
    profile,
  };
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

export function useSignupMutation(): UseMutationResult<ApiSignupResult, Error, SignupInput> {
  return useMutation({ mutationFn: postSignup });
}

export function useLookupCoachMutation(): UseMutationResult<ApiCoachSummary, Error, string> {
  return useMutation({ mutationFn: postLookupCoach });
}

export function useAttachCoachMutation(): UseMutationResult<void, Error, AttachCoachInput> {
  return useMutation({ mutationFn: postAttachCoach });
}
