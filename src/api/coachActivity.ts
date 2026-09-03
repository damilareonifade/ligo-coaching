import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { markActivityRead } from '@/lib/activity';
import { env } from '@/lib/env';

import { client } from './client';
import { mockActivity, mockDelay, mockMarkActivityRead } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiActivityGroup } from './types';

/* ------------------------------------------------------------------ *
 * The coach's activity feed. Grouping is the server's job — "TODAY"
 * and "EARLIER THIS WEEK" depend on the client's clock and the
 * client's timezone, neither of which the app should be guessing at
 * on a list it did not compose.
 * ------------------------------------------------------------------ */

async function fetchActivity(): Promise<readonly ApiActivityGroup[]> {
  if (env.useMocks) {
    return mockDelay(mockActivity());
  }
  const { data } = await client.get<readonly ApiActivityGroup[]>('/coach/activity');
  return data;
}

export function useActivityQuery(): UseQueryResult<readonly ApiActivityGroup[], Error> {
  return useQuery({ queryKey: queryKeys.coachActivity, queryFn: fetchActivity });
}

async function postActivityRead(itemId: string): Promise<void> {
  if (env.useMocks) {
    mockMarkActivityRead(itemId);
    await mockDelay(undefined, 200);
    return;
  }
  await client.post(`/coach/activity/${itemId}/read`);
}

/**
 * Optimistic because the row is being left behind: tapping it opens the client,
 * and the coach sees the feed again only on the way back. A dot that is still
 * there when they return reads as a tap that did not register, and they tap the
 * same row twice.
 */
export function useMarkActivityReadMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const key = queryKeys.coachActivity;

  return useMutation({
    mutationFn: postActivityRead,
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<readonly ApiActivityGroup[]>(key);

      queryClient.setQueryData<readonly ApiActivityGroup[]>(key, (current) =>
        current ? markActivityRead(current, itemId) : current,
      );

      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
