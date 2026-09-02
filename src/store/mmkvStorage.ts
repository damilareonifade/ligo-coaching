import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * Synchronous storage for Zustand `persist`.
 * Non-sensitive values only — tokens go to expo-secure-store.
 */
const storage = createMMKV({ id: 'ligo' });

export const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};
