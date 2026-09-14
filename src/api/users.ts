import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { ApiError } from './client';
import { queryKeys } from './queryKeys';
import { currentUserId, supabase } from './supabase';
import type { ApiProfile, ApiSessionUser, UserRole } from './types';

type UserRow = {
  readonly id: string;
  readonly email: string;
  readonly full_name: string;
  readonly avatar_url: string | null;
  readonly role: UserRole;
  readonly role_confirmed: boolean;
  readonly onboarded_at: string | null;
};

const COLUMNS = 'id, email, full_name, avatar_url, role, role_confirmed, onboarded_at';

export function profileFromRow(row: UserRow): ApiProfile {
  return {
    id: row.id,
    email: row.email,
    // The column is NOT NULL DEFAULT '' rather than nullable, so a provider
    // that sends no name yields a blank the UI can fall back on.
    name: row.full_name === '' ? (row.email.split('@')[0] ?? 'You') : row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    roleConfirmed: row.role_confirmed,
    onboardedAt: row.onboarded_at,
  };
}

/** The shape the auth store and tab bars already speak. */
export function sessionUserFromProfile(profile: ApiProfile): ApiSessionUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    avatarUrl: profile.avatarUrl,
  };
}

/**
 * Reads the signed-in user's own profile row.
 *
 * RLS scopes this to the caller, so no user id is passed — asking for someone
 * else's row would return nothing rather than an error.
 */
/**
 * The signed-in person's own row.
 *
 * The id is named explicitly, and that is the whole point of this function.
 * It used to be `select(COLUMNS).limit(1)`, leaning on RLS to mean "mine" —
 * but `users_select_linked` makes a client's coach visible to them and every
 * client visible to their coach, and with no ORDER BY `limit(1)` returns
 * whichever row Postgres reaches first.
 *
 * So a client attached to a coach could be handed the *coach's* row as their
 * own profile: their name, their email, `role: 'coach'` — and the app would
 * render the coaching side as that person. RLS decides what you may see; it
 * has never decided which of those rows is you.
 */
export async function fetchOwnProfile(): Promise<ApiProfile> {
  const { data, error, status } = await supabase
    .from('users')
    .select(COLUMNS)
    .eq('id', await currentUserId())
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  if (!data) {
    // The signup trigger creates this row in the same transaction as the
    // auth.users insert, so an absent row means the session outlived the
    // account (deleted user, or a token from another project).
    throw new ApiError('Your profile could not be found. Please sign in again.', 404);
  }
  return profileFromRow(data);
}

export interface ConfirmRoleInput {
  readonly role: UserRole;
}

/**
 * Locks in whether this person is a coach or a client.
 *
 * Only possible while `role_confirmed` is false — the database trigger
 * refuses a later change, so this cannot be used to hop between the two
 * sides of the app.
 */
export async function confirmRole({ role }: ConfirmRoleInput): Promise<ApiProfile> {
  const { data: session } = await supabase.auth.getSession();
  const id = session.session?.user.id;
  if (!id) throw new ApiError('You are not signed in.', 401);

  const { data, error, status } = await supabase
    .from('users')
    .update({ role, role_confirmed: true })
    .eq('id', id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  if (!data) throw new ApiError('Your profile could not be updated.', status);
  return profileFromRow(data);
}

/** Stamps the end of the onboarding flow, so it is not shown again. */
export async function markOnboarded(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const id = session.session?.user.id;
  if (!id) throw new ApiError('You are not signed in.', 401);

  const { error, status } = await supabase
    .from('users')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new ApiError(error.message, status);
}

export function useOwnProfileQuery(enabled = true): UseQueryResult<ApiProfile, Error> {
  return useQuery({ queryKey: queryKeys.profile, queryFn: fetchOwnProfile, enabled });
}

export function useConfirmRoleMutation(): UseMutationResult<ApiProfile, Error, ConfirmRoleInput> {
  return useMutation({ mutationFn: confirmRole });
}

export function useMarkOnboardedMutation(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: markOnboarded });
}
