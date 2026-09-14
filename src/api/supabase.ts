import 'react-native-url-polyfill/auto';

import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { env } from '@/lib/env';

import { ApiError } from './client';
import type { Database } from './database.types';

/**
 * Chunked SecureStore adapter for the auth session.
 *
 * A Supabase session (access + refresh JWT plus the user object) is larger
 * than the ~2048 bytes SecureStore accepts, so the value is sliced: `<key>`
 * holds the chunk count and `<key>.0…n` hold the slices. Supabase's own Expo
 * guide instead AES-encrypts the session into AsyncStorage via `aes-js`; this
 * keeps the tokens in the keychain — which is what CLAUDE.md requires — and
 * adds no dependency.
 *
 * Exported for its unit test — everything else should go through `supabase`.
 */
const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

async function readChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(key);
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export const secureSessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const count = await readChunkCount(key);
    if (count === 0) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_unused, index) =>
        SecureStore.getItemAsync(chunkKey(key, index)),
      ),
    );
    // A partially written session is unusable — report it as absent so
    // supabase-js falls back to signed-out rather than a malformed refresh.
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  setItem: async (key: string, value: string): Promise<void> => {
    const previousCount = await readChunkCount(key);
    const chunks: string[] = [];
    for (let start = 0; start < value.length; start += CHUNK_SIZE) {
      chunks.push(value.slice(start, start + CHUNK_SIZE));
    }
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)),
    );
    await SecureStore.setItemAsync(key, String(chunks.length));
    // Drop slices left behind by a longer previous session.
    await Promise.all(
      Array.from({ length: Math.max(previousCount - chunks.length, 0) }, (_unused, offset) =>
        SecureStore.deleteItemAsync(chunkKey(key, chunks.length + offset)),
      ),
    );
  },

  removeItem: async (key: string): Promise<void> => {
    const count = await readChunkCount(key);
    await Promise.all(
      Array.from({ length: count }, (_unused, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    );
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Where the session is kept. Exported so `signOut` can guarantee its removal
 * without depending on auth-js having managed it.
 */
export const SESSION_STORAGE_KEY = 'ligo.supabase.auth';

/**
 * The key auth-js used before this one, derived from the project ref the way
 * it derives it. Sessions written under it are unreachable now, and a
 * credential nobody reads is one nobody notices leaking — so `restore` clears
 * it on the way past.
 */
export const LEGACY_SESSION_STORAGE_KEY = `sb-${
  new URL(env.supabaseUrl).hostname.split('.')[0]
}-auth-token`;

/**
 * The one Supabase client. Reads and writes go through the Data API
 * (PostgREST) straight from the device, so every table it touches must have
 * RLS enabled with explicit policies.
 *
 * Typed against src/api/database.types.ts, which is generated from the
 * migrations in supabase/migrations — so a column rename breaks the build
 * rather than a screen.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.supabaseUrl,
  env.supabaseKey,
  {
    auth: {
      storage: secureSessionStorage,
      // Named explicitly rather than left to auth-js to derive from the URL,
      // so `signOut` can clear the stored session itself when the server call
      // to revoke it fails. Without a key we can address, a failed logout
      // leaves the session in the keychain and the next launch signs the
      // previous person back in.
      storageKey: SESSION_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      // auth-js defaults to the implicit flow, which hands the tokens back in
      // a URL fragment. PKCE keeps them out of the redirect entirely and is
      // what the Google and password-reset flows exchange their code against
      // — the verifier is held by the SecureStore adapter above.
      flowType: 'pkce',
      // Native has no URL to read a session out of; only web needs this.
      detectSessionInUrl: false,
    },
  },
);

/**
 * Refresh the access token only while the app is foregrounded — Supabase's
 * documented React Native pattern. Web manages its own timers.
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

/**
 * Turns a PostgREST result into the value or an `ApiError`, so Supabase
 * failures reach the UI as the same error type axios failures already do.
 *
 *   const students = unwrap(await supabase.from('students').select('*'));
 */
export function unwrap<T>(result: {
  readonly data: T | null;
  readonly error: PostgrestError | null;
  readonly status?: number;
}): T {
  if (result.error) {
    throw new ApiError(result.error.message, result.status ?? null);
  }
  if (result.data === null) {
    throw new ApiError('That record no longer exists.', result.status ?? null);
  }
  return result.data;
}

/**
 * The signed-in user's id, for the queries that have to name it.
 *
 * Most do not: RLS already scopes a client's own rows, and re-stating that in
 * a filter would be a second authority to keep in step. This is for the reads
 * where the caller has to be named — a coach signed in on the client side of
 * the app can see rows through a different policy, and a screen that means
 * "mine" must say so.
 *
 * Reads the cached session rather than `getUser()`, which is a network round
 * trip before every query.
 */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ApiError('You are not signed in.', 401);
  return id;
}

/**
 * The same, for a write that returns nothing.
 *
 * A delete or an insert without `.select()` comes back with `data: null` and
 * no error, which `unwrap` would report as a missing record — so those go
 * through this instead.
 */
export function assertOk(result: {
  readonly error: PostgrestError | null;
  readonly status?: number;
}): void {
  if (result.error) {
    throw new ApiError(result.error.message, result.status ?? null);
  }
}
