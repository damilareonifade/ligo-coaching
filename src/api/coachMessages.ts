import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { appendOwnMessage } from '@/lib/messages';

import { ApiError, client } from './client';
import { mockCoachThread, mockDelay, mockInbox, mockSendCoachMessage } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiCoachThread, ApiInboxEntry } from './types';

/* ------------------------------------------------------------------ *
 * The coach's side of messaging. The client's single thread lives in
 * src/api/clientChat.ts; this module owns the inbox and one thread per
 * client. The two share their components, not their endpoints.
 * ------------------------------------------------------------------ */

async function fetchInbox(query: string): Promise<readonly ApiInboxEntry[]> {
  if (env.useMocks) {
    return mockDelay(mockInbox(query));
  }
  const { data } = await client.get<readonly ApiInboxEntry[]>('/coach/messages', {
    params: query.length > 0 ? { q: query } : undefined,
  });
  return data;
}

/**
 * The search is part of the key, so each term is cached and going back to one
 * already typed is instant. Trimmed first — " maya" and "maya" are one query,
 * and keying them separately would fetch twice for the same list.
 *
 * `placeholderData` holds the previous term's rows while the next term loads.
 * Without it every keystroke is a brand-new key with no data, the screen falls
 * back to its skeleton, and the search field loses focus mid-word.
 */
export function useInboxQuery(query: string): UseQueryResult<readonly ApiInboxEntry[], Error> {
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.coachMessages.inbox(trimmed),
    queryFn: () => fetchInbox(trimmed),
    placeholderData: keepPreviousData,
  });
}

async function fetchCoachThread(clientId: string): Promise<ApiCoachThread> {
  if (env.useMocks) {
    const thread = mockCoachThread(clientId);
    if (!thread) throw new ApiError('That conversation is no longer available.', 404);
    return mockDelay(thread);
  }
  const { data } = await client.get<ApiCoachThread>(`/coach/messages/${clientId}`);
  return data;
}

export function useCoachThreadQuery(clientId: string): UseQueryResult<ApiCoachThread, Error> {
  return useQuery({
    queryKey: queryKeys.coachMessages.thread(clientId),
    queryFn: () => fetchCoachThread(clientId),
    enabled: clientId.length > 0,
  });
}

export interface SendCoachMessageInput {
  readonly clientId: string;
  readonly text: string;
}

async function postCoachMessage({ clientId, text }: SendCoachMessageInput): Promise<void> {
  if (env.useMocks) {
    mockSendCoachMessage(clientId, text);
    await mockDelay(undefined, 250);
    return;
  }
  await client.post(`/coach/messages/${clientId}`, { text });
}

/**
 * A message has to appear the instant it is sent — a thread that waits for the
 * network reads as a dropped message, and the reflex is to send it twice. The
 * stamp is "now" until the server hands back the one it composed.
 *
 * Only the thread is patched optimistically. The inbox row behind it is a
 * different list on a different key, so it is invalidated rather than guessed
 * at: its ordering and stamps are the server's to recompose.
 */
export function useSendCoachMessageMutation(): UseMutationResult<
  void,
  Error,
  SendCoachMessageInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCoachMessage,
    onMutate: async ({ clientId, text }) => {
      const key = queryKeys.coachMessages.thread(clientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiCoachThread>(key);

      queryClient.setQueryData<ApiCoachThread>(key, (current) =>
        current
          ? appendOwnMessage(current, {
              id: `optimistic-${Date.now()}`,
              text,
              when: 'now',
              from: 'me',
            })
          : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, { clientId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coachMessages.thread(clientId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachMessages.inboxAll });
    },
  });
}
