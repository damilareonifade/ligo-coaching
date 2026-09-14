import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { registerDeviceSession } from '@/api/appSessions';
import { setAuthToken } from '@/api/authToken';
import {
  LEGACY_SESSION_STORAGE_KEY,
  secureSessionStorage,
  SESSION_STORAGE_KEY,
  supabase,
} from '@/api/supabase';
import type { ApiAuthResult, ApiProfile, ApiSessionUser } from '@/api/types';
import { fetchOwnProfile, sessionUserFromProfile } from '@/api/users';

const USER_KEY = 'ligo.auth.user';

/**
 * The Supabase session is the source of truth for "is someone signed in" —
 * it lives in the keychain via the adapter in src/api/supabase.ts, refreshes
 * itself, and is what every RLS policy reads.
 *
 * The session user is still cached beside it because `role` decides which tab
 * bar renders, and a cold start on a bad connection should not drop a coach
 * into the client app while the profile request is in flight.
 */
function parseStoredUser(raw: string | null): ApiSessionUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { id, name, email, role } = parsed as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string' || typeof email !== 'string')
      return null;
    if (role !== 'client' && role !== 'coach') return null;
    const { avatarUrl } = parsed as { avatarUrl?: unknown };
    return {
      id,
      name,
      email,
      role,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
    };
  } catch {
    return null;
  }
}


/* ------------------------------------------------------------------ *
 * Debug logging.
 *
 * TEMPORARY — added to work out why a client account was landing in
 * the coach app. Remove it once that is settled.
 *
 * `__DEV__` only, so nothing reaches a release build. It prints to the
 * Metro console, which is local to the machine running the bundler; no
 * identity leaves the device.
 * ------------------------------------------------------------------ */
function logAuth(stage: string, user: ApiSessionUser | null, extra: Record<string, unknown>) {
  if (!__DEV__) return;

  console.log(`[auth] ${stage}`, {
    id: user?.id ?? null,
    email: user?.email ?? null,
    role: user?.role ?? null,
    // The single answer the tab bar acts on: anything but 'coach' renders
    // the client app.
    renders: user?.role === 'coach' ? 'COACH APP' : 'CLIENT APP',
    ...extra,
  });
}

export type AuthStatus = 'restoring' | 'signed-in' | 'signed-out';

interface AuthState {
  readonly status: AuthStatus;
  readonly user: ApiSessionUser | null;
  /**
   * True for an account created through Google, which arrives before we know
   * whether the person is a coach or a client. The tab layout redirects to
   * the role picker while this is set.
   */
  readonly needsRole: boolean;
  /**
   * True until `users.onboarded_at` is stamped. The tab layout redirects into
   * onboarding while it is set — without it nothing held anyone in the flow,
   * and on this project (email confirmation required) nobody signing up with
   * an address ever reached it at all.
   */
  readonly needsOnboarding: boolean;
  readonly restore: () => Promise<void>;
  readonly signIn: (result: ApiAuthResult, profile?: ApiProfile) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly setNeedsRole: (needsRole: boolean) => void;
  readonly setNeedsOnboarding: (needsOnboarding: boolean) => void;
}

/** Guards against a second listener when the root layout re-runs its effect. */
let authListenerBound = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'restoring',
  user: null,
  needsRole: false,
  needsOnboarding: false,

  /** Called once from the root layout before the first route renders. */
  restore: async () => {
    // Credentials under keys nothing reads any more: a bearer token from
    // before Supabase auth, and the session auth-js kept under its own derived
    // key before `storageKey` was named. One notices a leak from a key nobody
    // is watching least of all.
    void SecureStore.deleteItemAsync('ligo.auth.token').catch(() => undefined);
    void secureSessionStorage
      .removeItem(LEGACY_SESSION_STORAGE_KEY)
      .catch(() => undefined);

    if (!authListenerBound) {
      authListenerBound = true;
      // Keeps the store honest when auth-js acts on its own: a refreshed
      // token, an expired session, or a sign-out from another flow.
      supabase.auth.onAuthStateChange((event, session) => {
        setAuthToken(session?.access_token ?? null);
        if (event === 'SIGNED_OUT' || !session) {
          void SecureStore.deleteItemAsync(USER_KEY);
          set({ status: 'signed-out', user: null, needsRole: false, needsOnboarding: false });
        }
      });
    }

    const [{ data }, storedUser] = await Promise.all([
      supabase.auth.getSession(),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    const session = data.session;
    if (!session) {
      set({ status: 'signed-out', user: null, needsRole: false, needsOnboarding: false });
      return;
    }

    setAuthToken(session.access_token);
    const cached = parseStoredUser(storedUser);

    try {
      const profile = await fetchOwnProfile();
      const user = sessionUserFromProfile(profile);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      logAuth('restore · fresh profile', user, {
        source: 'supabase',
        roleConfirmed: profile.roleConfirmed,
        onboardedAt: profile.onboardedAt,
        cachedRoleWas: cached?.role ?? null,
      });
      set({
        status: 'signed-in',
        user,
        needsRole: !profile.roleConfirmed,
        needsOnboarding: profile.onboardedAt === null,
      });
    } catch (error) {
      logAuth('restore · profile fetch FAILED', cached, {
        source: cached ? 'secure-store cache' : 'none',
        reason: error instanceof Error ? error.message : String(error),
      });
      // Offline, or the profile request failed. With a cached identity the
      // session is still usable, so stay signed in rather than bouncing
      // someone to login for a network blip — and neither gate can be
      // answered without the profile, so assume both are satisfied rather
      // than trapping someone in onboarding because a request timed out.
      //
      // With no cache there is nothing to be signed in *as*. `role` decides
      // which half of the app renders, and a session with no role rendered
      // the coach app to whoever happened to be holding the phone. Signing
      // out is the honest answer: they can sign in again in a second.
      if (!cached) {
        set({ status: 'signed-out', user: null, needsRole: false, needsOnboarding: false });
        return;
      }

      set({ status: 'signed-in', user: cached, needsRole: false, needsOnboarding: false });
    }

    void registerDeviceSession().catch(() => undefined);
  },

  signIn: async ({ token, user }, profile) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    setAuthToken(token);
    logAuth('signIn', user, {
      // `undefined` means the caller passed no profile, which leaves both
      // gates at false — worth seeing if onboarding is being skipped.
      profilePassed: profile !== undefined,
      roleConfirmed: profile?.roleConfirmed ?? null,
      onboardedAt: profile?.onboardedAt ?? null,
    });
    set({
      status: 'signed-in',
      user,
      needsRole: profile ? !profile.roleConfirmed : false,
      needsOnboarding: profile ? profile.onboardedAt === null : false,
    });

    // Telemetry, not a gate: a device row that cannot be written must not
    // block the sign-in that just succeeded.
    void registerDeviceSession().catch(() => undefined);
  },

  /**
   * Signing out has to be true on this device whatever the network says.
   *
   * `supabase.auth.signOut()` asks the server to revoke the token first, and
   * when that request fails auth-js returns the error *without clearing the
   * stored session*. Swallowing the error left the app saying "signed out"
   * while the keychain still held the session — and the next launch restored
   * it, signing the previous person back in.
   *
   * So the local session is removed unconditionally, after the attempt. The
   * server call is still made and still worth making: it revokes the refresh
   * token everywhere else. It is just no longer what decides whether this
   * device is signed out.
   */
  signOut: async () => {
    const revoked = await supabase.auth
      .signOut()
      .then(({ error }) => (error ? error.message : null))
      .catch((error: unknown) =>
        error instanceof Error ? error.message : String(error),
      );

    await Promise.all([
      SecureStore.deleteItemAsync(USER_KEY),
      secureSessionStorage.removeItem(SESSION_STORAGE_KEY),
    ]);

    logAuth('signOut', null, {
      // Null means the server revoked it too. Anything else is a token still
      // live elsewhere — this device is signed out either way.
      serverRevokeError: revoked,
    });

    setAuthToken(null);
    set({ status: 'signed-out', user: null, needsRole: false, needsOnboarding: false });
  },

  setNeedsRole: (needsRole) => {
    if (get().needsRole !== needsRole) set({ needsRole });
  },

  setNeedsOnboarding: (needsOnboarding) => {
    if (get().needsOnboarding !== needsOnboarding) set({ needsOnboarding });
  },
}));
