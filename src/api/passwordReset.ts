import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import * as Linking from 'expo-linking';

import { ApiError } from './client';
import { supabase } from './supabase';

/**
 * Where the reset email sends people back to. Must be listed in Supabase →
 * Authentication → URL Configuration → Redirect URLs alongside the Google
 * callback, or the link opens the site instead of the app.
 */
export function resetRedirectUrl(): string {
  return Linking.createURL('reset-password');
}

/**
 * Asks Supabase to email a reset link.
 *
 * The RPC runs first and throws when the address has asked too often — it is
 * the throttle, and letting the mail go out before recording the attempt
 * would make the limit advisory. Neither call reveals whether the account
 * exists: GoTrue answers identically either way, and the ledger records
 * unknown addresses too, so this cannot be used to enumerate users.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();

  const { error: throttleError } = await supabase.rpc('record_password_reset_request', {
    p_email: normalized,
  });
  if (throttleError) throw new ApiError(throttleError.message, null);

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: resetRedirectUrl(),
  });
  if (error) throw new ApiError(error.message, error.status ?? null);
}

/**
 * Exchanges the code from the reset link for a recovery session.
 *
 * Until this succeeds there is no session, so `updateUser` below would have
 * nothing to authenticate against.
 */
export async function startPasswordRecovery(code: string): Promise<string> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw new ApiError(error.message, error.status ?? null);

  const email = data.session?.user.email;
  if (!email) throw new ApiError('That reset link is no longer valid.', 400);
  return email;
}

export interface CompletePasswordResetInput {
  readonly password: string;
}

/**
 * Sets the new password, then closes the ledger entry.
 *
 * The ledger call takes no address: it reads the caller's own from the
 * recovery session's JWT, so it cannot be aimed at anyone else's row. See
 * supabase/migrations/20260910093000_function_grants.sql.
 *
 * The recovery session is signed out afterwards: it was minted by a link in an
 * inbox, and a fresh sign-in with the new password is the point.
 */
export async function completePasswordReset({
  password,
}: CompletePasswordResetInput): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new ApiError(error.message, error.status ?? null);

  // Audit only — a failure here must not tell the user their reset failed,
  // because it did not.
  await supabase.rpc('complete_password_reset_request');

  await supabase.auth.signOut();
}

export function useRequestPasswordResetMutation(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useCompletePasswordResetMutation(): UseMutationResult<
  void,
  Error,
  CompletePasswordResetInput
> {
  return useMutation({ mutationFn: completePasswordReset });
}
