import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { ApiError } from './client';
import { supabase } from './supabase';
import type { ApiAuthResult, ApiProfile, UserRole } from './types';
import { confirmRole, fetchOwnProfile, sessionUserFromProfile } from './users';

/** Completes the popup handshake on web; a no-op on native. */
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

/**
 * Where Google sends the browser back to. `Linking.createURL` produces the
 * dev-client/Expo Go tunnel URL in development and `ligo://auth/callback`
 * (app.json `scheme`) in a standalone build, so the same code works in both.
 *
 * This exact URL must also be listed in Supabase → Authentication → URL
 * Configuration → Redirect URLs, or the provider rejects the round trip.
 */
export function googleRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/**
 * Reads the redirect's query string with the standard URL API rather than
 * `Linking.parse`, which resolves the Expo host URI out of the manifest — an
 * unnecessary dependency for pulling one param off a URL we just built.
 * `URL` is polyfilled for native in src/api/supabase.ts.
 */
function redirectParams(url: string): URLSearchParams {
  try {
    return new URL(url).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export interface GoogleSignInResult {
  readonly session: ApiAuthResult;
  readonly profile: ApiProfile;
  /**
   * True when the profile had no confirmed role as we arrived — which is the
   * signal for "this account is new here". Callers use it to send someone
   * into onboarding rather than back through it: once a role is confirmed,
   * tapping "create account with Google" is just a sign-in.
   */
  readonly roleWasUnconfirmed: boolean;
}

/**
 * Trades an authorization code for a session and reads back the profile row.
 *
 * Shared by two callers that arrive at the same place from different
 * directions: the in-app browser flow below, which is handed the redirect
 * URL directly, and src/app/auth/callback.tsx, which catches the redirect as
 * a deep link when the OS gives it to the app instead.
 */
export async function completeGoogleRedirect(
  code: string,
  role: UserRole | null,
): Promise<GoogleSignInResult> {
  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) {
    throw new ApiError(exchange.error.message, exchange.error.status ?? null);
  }

  const { session } = exchange.data;
  if (!session) throw new ApiError('Google sign-in did not return a session.', null);

  let profile = await fetchOwnProfile();
  const roleWasUnconfirmed = !profile.roleConfirmed;

  // Only for an account that has never chosen: the database refuses a change
  // once confirmed, so this cannot switch an existing coach to a client.
  if (roleWasUnconfirmed && role !== null) {
    profile = await confirmRole({ role });
  }

  return {
    session: { token: session.access_token, user: sessionUserFromProfile(profile) },
    profile,
    roleWasUnconfirmed,
  };
}

/**
 * Opens Google in an auth session, trades the returned code for a Supabase
 * session, and returns the profile row that the signup trigger created.
 *
 * Signing in and signing up are the same call here: if Google's account is
 * new to the project, GoTrue inserts into `auth.users` and the trigger in
 * supabase/migrations creates `public.users` in the same transaction. So a
 * first "Continue with Google" *is* the account creation.
 *
 * `role` is what the person picked on the signup screen, when they came that
 * way. Google carries no such field, so an account created from the login
 * screen arrives with `role_confirmed = false` and the caller sends them to
 * the role picker. Passing a role here confirms it in one round trip.
 *
 * Resolves to `null` when the browser is dismissed without finishing — a
 * choice, not an error, and it must not raise a toast. Everything else throws
 * an `ApiError` so it reads like the rest of the API layer.
 */
export async function signInWithGoogle(
  // Explicit rather than defaulted: as an optional parameter this widens the
  // mutation's variable type to include `undefined`, which the hook's own
  // signature then cannot express.
  role: UserRole | null,
): Promise<GoogleSignInResult | null> {
  const redirectTo = googleRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // We open the browser ourselves so the session closes on redirect.
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new ApiError(error.message, error.status ?? null);
  if (!data.url) throw new ApiError('Could not reach Google. Please try again.', null);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;

  const params = redirectParams(result.url);
  const denied = params.get('error_description') ?? params.get('error');
  if (denied) throw new ApiError(denied, null);

  const code = params.get('code');
  if (!code) throw new ApiError('Google did not return a sign-in code.', null);

  return completeGoogleRedirect(code, role);
}

export function useGoogleSignInMutation(): UseMutationResult<
  GoogleSignInResult | null,
  Error,
  UserRole | null
> {
  return useMutation({ mutationFn: signInWithGoogle });
}
