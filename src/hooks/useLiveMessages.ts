import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/api/supabase';
import { env } from '@/lib/env';

export interface LiveMessagesOptions {
  /**
   * Names the channel. One per subscription on screen — an open thread uses
   * its own id, the inbox uses a constant — because two channels sharing a
   * name are one channel, and the second screen to mount would silently take
   * over the first's.
   */
  readonly key: string;
  /**
   * Narrows what arrives, e.g. `thread_id=eq.<id>`. Left out, every message
   * the caller is allowed to see arrives — which is what the inbox wants, and
   * is scoped by `messages_select_in_my_threads` rather than by this string.
   */
  readonly filter?: string;
  /** False while the screen still has nothing to listen about. */
  readonly enabled?: boolean;
  /** Everything a new message makes stale. */
  readonly invalidate: readonly QueryKey[];
}

/**
 * Tells a screen when somebody has spoken.
 *
 * It invalidates rather than appending the row it was handed. TanStack Query
 * is the one thing that decides what a thread holds, and a listener writing
 * into the cache would be a second writer with its own idea of the shape — it
 * would have to compose the stamp and resolve `from` against the reader, and
 * agree with `toChatMessages` about both, forever. A refetch costs one round
 * trip on a screen that is already open, and keeps the answer in one place.
 *
 * Postgres Changes runs every event through RLS, so what arrives here is
 * already only what this person may read. The filter narrows; it does not
 * protect.
 */
export function useLiveMessages({
  key,
  filter,
  enabled = true,
  invalidate,
}: LiveMessagesOptions): void {
  const queryClient = useQueryClient();

  /**
   * Bumped when the app returns to the foreground, which tears the channel
   * down and builds a new one.
   *
   * The socket does not survive backgrounding, and a dead channel is silent
   * rather than noisy — it does not error, it stops delivering. Without this
   * the screen looks fine and quietly stops updating for the rest of the
   * session, which is worse than never having subscribed at all.
   */
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGeneration((current) => current + 1);
    });
    return () => listener.remove();
  }, []);

  // Every caller builds this array inline, so it is a new identity on each
  // render. Keyed on its contents instead, or the effect would drop and
  // rebuild the channel on every render of the screen holding it.
  const keys = JSON.stringify(invalidate);

  useEffect(() => {
    // Mocks have no server to hear from. Guarded here rather than at the call
    // sites, so a screen reads the same either way.
    if (env.useMocks || !enabled) return;

    const channel = supabase
      .channel(`messages:${key}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', ...(filter ? { filter } : {}) },
        () => {
          for (const queryKey of JSON.parse(keys) as QueryKey[]) {
            void queryClient.invalidateQueries({ queryKey });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, filter, generation, key, keys, queryClient]);
}
