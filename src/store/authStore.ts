import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { setAuthToken } from '@/api/authToken';
import type { ApiAuthResult, ApiSessionUser } from '@/api/types';

const TOKEN_KEY = 'ligo.auth.token';
const USER_KEY = 'ligo.auth.user';

/**
 * The session user is persisted next to the token because `role` decides which
 * tab bar and which Today screen render — without it, a relaunched client sees
 * the coach app. Once there is a real backend this should become a `/auth/me`
 * fetch on restore; SecureStore holds it meanwhile because it is PII.
 */
function parseStoredUser(raw: string | null): ApiSessionUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { id, name, email, role } = parsed as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string' || typeof email !== 'string') return null;
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
  readonly restore: () => Promise<void>;
  readonly signIn: (result: ApiAuthResult) => Promise<void>;
  readonly signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  user: null,

  /** Called once from the root layout before the first route renders. */
  restore: async () => {
    const [token, storedUser] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    if (token) {
      setAuthToken(token);
      set({ status: 'signed-in', user: parseStoredUser(storedUser) });
      return;
    }
    set({ status: 'signed-out', user: null });
  },

  signIn: async ({ token, user }) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    setAuthToken(token);
    set({ status: 'signed-in', user });
  },

  signOut: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setAuthToken(null);
    set({ status: 'signed-out', user: null });
  },
}));
