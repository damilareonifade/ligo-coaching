import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockClientChat, mockDelay, mockSendMessage } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiClientChat } from './types';

async function fetchClientChat(): Promise<ApiClientChat> {
  if (env.useMocks) {
    return mockDelay(mockClientChat());
  }
  const { data } = await client.get<ApiClientChat>('/client/chat');
  return data;
}

export function useClientChatQuery(): UseQueryResult<ApiClientChat, Error> {
  return useQuery({ queryKey: queryKeys.clientChat, queryFn: fetchClientChat });
}

export interface SendMessageInput {
  readonly text: string;
}

async function postMessage({ text }: SendMessageInput): Promise<void> {
  if (env.useMocks) {
    mockSendMessage(text);
    await mockDelay(undefined, 250);
    return;
  }
  await client.post('/client/chat', { text });
}

/**
 * A message has to appear the instant it is sent — a thread that waits for the
 * network reads as a dropped message, and the reflex is to send it twice. The
 * stamp is "now" until the server hands back the one it composed.
 */
export function useSendMessageMutation(): UseMutationResult<void, Error, SendMessageInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postMessage,
    onMutate: async ({ text }) => {
      const key = queryKeys.clientChat;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientChat>(key);

      queryClient.setQueryData<ApiClientChat>(key, (current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages,
                {
                  id: `optimistic-${Date.now()}`,
                  text,
                  when: 'now',
                  from: 'me',
                },
              ],
            }
          : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientChat });
    },
  });
}
