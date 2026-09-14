import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { hasUnread, markNotificationRead } from '@/lib/notifications';
import { useAuthStore } from '@/store/authStore';

import { mockDelay, mockMarkNotificationRead, mockNotifications } from './mocks';
import { queryKeys } from './queryKeys';
import { assertOk, supabase, unwrap } from './supabase';
import { toNotificationGroups } from './rows';
import type { ApiNotificationGroup } from './types';

/* ------------------------------------------------------------------ *
 * One feed, read from whichever side you are on.
 *
 * The coach's used to be "Activity" and the client's "Notifications",
 * with two shapes, two query modules and two screens — for events that
 * are the same events. A coach reading "Maya finished Upper A" and
 * Maya reading "Sam assigned you Upper A" are at opposite ends of one
 * table.
 *
 * Grouping stays the server's job: "TODAY" and "EARLIER THIS WEEK"
 * depend on a clock and a timezone the device should not be guessing
 * at for a list it did not compose.
 * ------------------------------------------------------------------ */

export type NotificationAudience = 'coach' | 'client';

async function fetchNotifications(
  audience: NotificationAudience,
): Promise<readonly ApiNotificationGroup[]> {
  if (env.useMocks) {
    return mockDelay(mockNotifications(audience));
  }

  // No audience argument: the RPC reads `auth.uid()` and RLS decides whose
  // rows come back. Passing one would be a second authority on who you are,
  // and the app has been bitten by exactly that before.
  return toNotificationGroups(unwrap(await supabase.rpc('notifications_feed', { p_limit: 50 })));
}

export function useNotificationsQuery(): UseQueryResult<
  readonly ApiNotificationGroup[],
  Error
> {
  const audience: NotificationAudience =
    useAuthStore((state) => state.user?.role) === 'coach' ? 'coach' : 'client';

  return useQuery({
    queryKey: queryKeys.notifications(audience),
    queryFn: () => fetchNotifications(audience),
  });
}

async function postNotificationRead(id: string): Promise<void> {
  if (env.useMocks) {
    mockMarkNotificationRead(id);
    await mockDelay(undefined, 150);
    return;
  }
  // Idempotent server-side — `coalesce(read_at, now())` — so a thumb that taps
  // twice is not an error.
  assertOk(await supabase.rpc('mark_notification_read', { p_id: id }));
}

/**
 * Optimistic, because the row is being left behind: tapping it opens
 * something, and the feed is seen again only on the way back. A dot still
 * there on return reads as a tap that did not register, and the same row gets
 * tapped twice.
 */
export function useMarkNotificationReadMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const audience: NotificationAudience =
    useAuthStore((state) => state.user?.role) === 'coach' ? 'coach' : 'client';
  const key = queryKeys.notifications(audience);

  return useMutation({
    mutationFn: postNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<readonly ApiNotificationGroup[]>(key);

      queryClient.setQueryData<readonly ApiNotificationGroup[]>(key, (current) =>
        current ? markNotificationRead(current, id) : current,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The dot on the bell.
 *
 * Its own query rather than a count off the feed: Today shows the dot
 * and almost nobody opens the feed, so paying for the whole list to
 * decide whether to draw a 8px circle is the wrong trade. A count is
 * one indexed row.
 * ------------------------------------------------------------------ */

async function fetchUnread(audience: NotificationAudience): Promise<boolean> {
  if (env.useMocks) {
    return mockDelay(hasUnread(mockNotifications(audience)), 150);
  }
  return unwrap(await supabase.rpc('unread_notification_count')) > 0;
}

export function useUnreadNotificationsQuery(): UseQueryResult<boolean, Error> {
  const audience: NotificationAudience =
    useAuthStore((state) => state.user?.role) === 'coach' ? 'coach' : 'client';

  return useQuery({
    queryKey: [...queryKeys.notifications(audience), 'unread'],
    queryFn: () => fetchUnread(audience),
  });
}
