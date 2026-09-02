import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { setAuthToken } from '@/api/authToken';
import type { ApiAuthResult, ApiCoach } from '@/api/types';

const TOKEN_KEY = 'ligo.auth.token';

export type AuthStatus = 'restoring' | 'signed-in' | 'signed-out';

interface AuthState {
  readonly status: AuthStatus;
  readonly coach: ApiCoach | null;
  readonly restore: () => Promise<void>;
  readonly signIn: (result: ApiAuthResult) => Promise<void>;
  readonly signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  coach: null,

  /** Called once from the root layout before the first route renders. */
  restore: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      setAuthToken(token);
      set({ status: 'signed-in' });
      return;
    }
    set({ status: 'signed-out', coach: null });
  },

  signIn: async ({ token, coach }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    set({ status: 'signed-in', coach });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    set({ status: 'signed-out', coach: null });
  },
}));
