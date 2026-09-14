/**
 * Email/password auth, against Supabase.
 *
 * Unlike the data modules, nothing here branches on `env.useMocks`: signing in
 * is a real round trip either way, and a mock session would hand the app a
 * token no Supabase table would accept. Google sign-in lives in
 * src/api/googleAuth.ts.
 */
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { env } from '@/lib/env';

import { ApiError } from './client';
import { mockDelay } from './mocks';
import { assertOk, supabase, unwrap } from './supabase';
import type {
  ApiCoachSummary,
  ApiLoginResult,
  ApiProfile,
  ApiSharePermissions,
  ApiSignupResult,
  UserRole,
} from './types';
import { fetchOwnProfile, sessionUserFromProfile } from './users';

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

async function postLogin(input: LoginInput): Promise<ApiLoginResult> {
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
  return {
    session: { token: session.access_token, user: sessionUserFromProfile(profile) },
    profile,
  };
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

/**
 * "Strength coach · Ironworks Lagos · 18 clients".
 *
 * Built from what the coach typed on the onboarding step that told them
 * "Clients see this before they attach" — which until `coach_profiles` existed
 * was not true of anything on it. Each part is dropped rather than faked when
 * it is missing, so a coach who skipped the step still reads as "Coach", and
 * one with nobody yet says so instead of claiming zero clients.
 */
function coachHeadline(
  clientCount: number,
  specialties: readonly string[],
  gym: string,
): string {
  const parts = [specialties[0] ? `${specialties[0]} coach` : 'Coach'];
  if (gym.trim().length > 0) parts.push(gym.trim());
  parts.push(
    clientCount > 0
      ? `${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`
      : 'new here',
  );
  return parts.join(' · ');
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

async function postLookupCoach(code: string): Promise<ApiCoachSummary> {
  if (env.useMocks) {
    if (code.trim().length === 0) {
      throw new Error('Enter an invite code.');
    }
    return mockDelay(mockLookedUpCoach);
  }

  const [coach] = unwrap(await supabase.rpc('lookup_coach', { p_code: code }));

  // An unmatched code comes back empty rather than as an error — the lookup is
  // rate-limited, and a raised exception would roll back the very row the
  // limit counts. See the note on `lookup_coach`.
  if (!coach) throw new ApiError('That code does not match a coach.', 404);

  return {
    id: coach.id,
    name: coach.full_name,
    initials: initialsOf(coach.full_name),
    headline: coachHeadline(coach.client_count, coach.specialties, coach.gym),
  };
}

export interface AttachCoachInput {
  readonly coachId: string;
  readonly permissions: ApiSharePermissions;
  readonly logFor: boolean;
}

async function postAttachCoach(input: AttachCoachInput): Promise<void> {
  if (env.useMocks) {
    return mockDelay(undefined);
  }

  // Named arguments rather than a permissions object: the five booleans are
  // the contract, so adding a domain without deciding what it defaults to is a
  // compile error rather than a key that quietly goes missing.
  assertOk(
    await supabase.rpc('attach_coach', {
      p_coach_id: input.coachId,
      p_workouts: input.permissions.workouts,
      p_nutrition: input.permissions.nutrition,
      p_metrics: input.permissions.metrics,
      p_health: input.permissions.health,
      p_monthly: input.permissions.monthly,
      p_log_for: input.logFor,
    }),
  );
}

export function useLoginMutation(): UseMutationResult<ApiLoginResult, Error, LoginInput> {
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
