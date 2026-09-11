import { ApiError } from './client';
import { supabase } from './supabase';

/**
 * Per-user server-side cache.
 *
 * The device already caches locally with MMKV; this is the layer that
 * survives a reinstall and follows someone onto a second device. Nothing here
 * is a source of truth — every read must tolerate a miss, because the row can
 * expire or be swept at any time.
 */

/** Keys are namespaced so one feature cannot stomp another's entry. */
export const cacheKeys = {
  appSettings: 'settings:v1',
  rosterSnapshot: 'roster:v1',
} as const;

export type CacheKey = (typeof cacheKeys)[keyof typeof cacheKeys];

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Reads a cache entry, treating an expired row as absent.
 *
 * The expiry filter is applied here rather than in a policy because RLS
 * cannot express "and not expired" — see supabase/migrations for the sweeper
 * that reclaims the rows this skips.
 */
export async function readCache<T>(key: CacheKey): Promise<T | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('cache')
    .select('value, expires_at')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  // A cache read must never break a screen: on failure, behave like a miss.
  if (error || !data) return null;
  if (data.expires_at !== null && new Date(data.expires_at).getTime() <= Date.now()) {
    return null;
  }
  return data.value as T;
}

export interface WriteCacheOptions {
  /** Seconds until the entry expires. Omit to keep it until invalidated. */
  readonly ttlSeconds?: number;
}

export async function writeCache(
  key: CacheKey,
  value: unknown,
  { ttlSeconds }: WriteCacheOptions = {},
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;

  const expiresAt =
    ttlSeconds === undefined ? null : new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { error, status } = await supabase.from('cache').upsert(
    {
      user_id: userId,
      key,
      // The column is jsonb; anything JSON-serialisable round-trips.
      value: value as never,
      expires_at: expiresAt,
    },
    { onConflict: 'user_id,key' },
  );

  if (error) throw new ApiError(error.message, status);
}

export async function invalidateCache(key: CacheKey): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;

  const { error, status } = await supabase
    .from('cache')
    .delete()
    .eq('user_id', userId)
    .eq('key', key);

  if (error) throw new ApiError(error.message, status);
}
