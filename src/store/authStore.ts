import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { registerDeviceSession } from '@/api/appSessions';
import { setAuthToken } from '@/api/authToken';
import { supabase } from '@/api/supabase';
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
  readonly restore: () => Promise<void>;
  readonly signIn: (result: ApiAuthResult, profile?: ApiProfile) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly setNeedsRole: (needsRole: boolean) => void;
}

/** Guards against a second listener when the root layout re-runs its effect. */
let authListenerBound = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'restoring',
  user: null,
  needsRole: false,

  /** Called once from the root layout before the first route renders. */
  restore: async () => {
    // Installs that predate Supabase auth still hold a bearer token under the
    // old key. Nothing reads it any more, and a credential no one reads is
    // one no one notices leaking — so clear it on the way past.
    void SecureStore.deleteItemAsync('ligo.auth.token').catch(() => undefined);

    if (!authListenerBound) {
      authListenerBound = true;
      // Keeps the store honest when auth-js acts on its own: a refreshed
      // token, an expired session, or a sign-out from another flow.
      supabase.auth.onAuthStateChange((event, session) => {
        setAuthToken(session?.access_token ?? null);
        if (event === 'SIGNED_OUT' || !session) {
          void SecureStore.deleteItemAsync(USER_KEY);
          set({ status: 'signed-out', user: null, needsRole: false });
        }
      });
    }

    const [{ data }, storedUser] = await Promise.all([
      supabase.auth.getSession(),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    const session = data.session;
    if (!session) {
      set({ status: 'signed-out', user: null, needsRole: false });
      return;
    }

    setAuthToken(session.access_token);
    const cached = parseStoredUser(storedUser);

    try {
      const profile = await fetchOwnProfile();
      const user = sessionUserFromProfile(profile);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      set({ status: 'signed-in', user, needsRole: !profile.roleConfirmed });
    } catch {
      // Offline, or the profile request failed. The session is still valid,
      // so stay signed in on the cached identity rather than bouncing someone
      // to the login screen for a network blip.
      set({ status: 'signed-in', user: cached, needsRole: false });
    }

    void registerDeviceSession().catch(() => undefined);
  },

  signIn: async ({ token, user }, profile) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    setAuthToken(token);
    set({
      status: 'signed-in',
      user,
      needsRole: profile ? !profile.roleConfirmed : false,
    });

    // Telemetry, not a gate: a device row that cannot be written must not
    // block the sign-in that just succeeded.
    void registerDeviceSession().catch(() => undefined);
  },

  signOut: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(USER_KEY),
      // Swallowed: revoking the token server-side needs the network, and
      // signing out locally must work on a plane.
      supabase.auth.signOut().catch(() => undefined),
    ]);
    setAuthToken(null);
    set({ status: 'signed-out', user: null, needsRole: false });
  },

  setNeedsRole: (needsRole) => {
    if (get().needsRole !== needsRole) set({ needsRole });
  },
}));
