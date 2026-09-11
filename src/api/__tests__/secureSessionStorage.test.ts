import * as SecureStore from 'expo-secure-store';

import { secureSessionStorage } from '@/api/supabase';

/**
 * The session is sliced across SecureStore keys because a real Supabase
 * session exceeds the ~2048-byte limit. jest.setup.ts mocks expo-secure-store
 * with inert no-ops, so back it with a real map for these tests.
 */
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => store.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    store.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    store.delete(key);
  });
});

const KEY = 'sb-tblujcawpwvedllowuuy-auth-token';

describe('secureSessionStorage', () => {
  it('round-trips a session larger than the SecureStore limit', async () => {
    const session = JSON.stringify({ access_token: 'a'.repeat(4000), refresh_token: 'r' });

    await secureSessionStorage.setItem(KEY, session);

    expect(await secureSessionStorage.getItem(KEY)).toBe(session);
    // Sliced, and no single slice may exceed the limit.
    expect(store.get(KEY)).toBe('3');
    for (const [key, value] of store) {
      if (key !== KEY) expect(value.length).toBeLessThanOrEqual(2048);
    }
  });

  it('reads back a session small enough to fit one slice', async () => {
    await secureSessionStorage.setItem(KEY, 'short');
    expect(await secureSessionStorage.getItem(KEY)).toBe('short');
  });

  it('returns null when nothing is stored', async () => {
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('drops slices left behind by a longer previous session', async () => {
    await secureSessionStorage.setItem(KEY, 'x'.repeat(5000));
    await secureSessionStorage.setItem(KEY, 'y'.repeat(100));

    expect(await secureSessionStorage.getItem(KEY)).toBe('y'.repeat(100));
    expect(store.has(`${KEY}.1`)).toBe(false);
    expect(store.has(`${KEY}.2`)).toBe(false);
  });

  it('treats a partially written session as absent', async () => {
    await secureSessionStorage.setItem(KEY, 'z'.repeat(4000));
    store.delete(`${KEY}.1`);

    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('clears every slice on removeItem', async () => {
    await secureSessionStorage.setItem(KEY, 'w'.repeat(4000));
    await secureSessionStorage.removeItem(KEY);

    expect(store.size).toBe(0);
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });
});
