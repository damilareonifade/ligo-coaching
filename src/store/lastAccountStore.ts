import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ApiSessionUser, UserRole } from '@/api/types';

import { mmkvStorage } from './mmkvStorage';

/**
 * Who used this device last. Enough to greet them by name on the welcome
 * screen and hand the sign-in form their address — and nothing more.
 */
export interface LastAccount {
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly avatarUrl: string | null;
}

interface LastAccountState {
  readonly account: LastAccount | null;
  readonly remember: (user: ApiSessionUser) => void;
  readonly forget: () => void;
}

/**
 * The account the welcome screen offers to continue as.
 *
 * Deliberately *not* cleared by signing out — being able to tap your own name
 * instead of typing an address again is the whole reason this exists, and
 * sign-out is exactly when it is needed. What sign-out clears is the session:
 * the token in the keychain and the cached identity in `authStore`. This is a
 * name on a doorbell, not a key.
 *
 * MMKV rather than `expo-secure-store` because none of it is a credential —
 * no token, no password, nothing that grants access. It is the same
 * information the lock screen of a phone shows, and it is removable from the
 * welcome screen itself ("Forget this account"), which is the promise the
 * menu there has to keep.
 */
export const useLastAccountStore = create<LastAccountState>()(
  persist(
    (set) => ({
      account: null,
      remember: ({ name, email, role, avatarUrl }) =>
        set({ account: { name, email, role, avatarUrl } }),
      forget: () => set({ account: null }),
    }),
    {
      // `ligo.` like every other key on this device: the rename to SetTrack
      // deliberately left storage keys alone rather than stranding what is
      // already written under them.
      name: 'ligo.lastAccount',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ account }) => ({ account }),
    },
  ),
);
