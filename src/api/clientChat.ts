import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { initials } from '@/lib/format';
import { env } from '@/lib/env';
import { accessLabel, deriveAccess } from '@/lib/roster';

import { ApiError } from './client';
import { mockClientChat, mockDelay, mockSendMessage } from './mocks';
import { queryKeys } from './queryKeys';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import { toChatMessages } from './rows';
import type { ApiClientChat, ApiSharePermissions } from './types';

/**
 * "Strength coach · Ironworks Lagos" — who they are, in the words they chose
 * for themselves.
 *
 * The mock read "Strength coach · replies most days". The second half is gone
 * rather than reimplemented: nothing measures how often anybody replies, and a
 * line that promises a response time the app cannot keep is worse than no line
 * — it is read by somebody waiting for an answer.
 */
function coachContext(specialties: readonly string[] | null, gym: string | null): string {
  const lead = specialties?.[0] ? `${specialties[0]} coach` : 'Your coach';
  const place = gym?.trim();
  return place ? `${lead} · ${place}` : lead;
}

async function fetchClientChat(): Promise<ApiClientChat> {
  if (env.useMocks) {
    return mockDelay(mockClientChat());
  }

  const [me, threads] = await Promise.all([
    currentUserId(),
    supabase.rpc('my_threads').then(unwrap),
  ]);

  const thread = threads.find((row) => row.kind === 'direct');
  // Both doors to this screen — the Today card and the profile row — are shut
  // unless a coach is attached, and somebody training alone is offered "Add a
  // coach" instead. So this is a deep link, not a state the app can reach.
  if (!thread) {
    throw new ApiError('You do not have a coach attached.', null);
  }

  const rows = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id')
    .eq('thread_id', thread.thread_id)
    .order('created_at')
    .then(unwrap);

  const coachName = thread.coach_name ?? '';
  const permissions = (thread.permissions ?? {}) as ApiSharePermissions;

  return {
    threadId: thread.thread_id,
    coachName,
    coachInitials: initials(coachName),
    context: coachContext(thread.coach_specialties, thread.coach_gym),
    chipLabel: accessLabel[deriveAccess(permissions)],
    archived: thread.archived ?? false,
    messages: toChatMessages(rows, me),
  };
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

  const [me, threads] = await Promise.all([
    currentUserId(),
    supabase.rpc('my_threads').then(unwrap),
  ]);

  const thread = threads.find((row) => row.kind === 'direct');
  if (!thread) {
    throw new ApiError('You do not have a coach attached.', null);
  }

  // A closed thread refuses this at the database anyway — the composer is
  // already gone from an archived thread, and the policy is what makes that
  // true rather than merely displayed.
  assertOk(
    await supabase
      .from('messages')
      .insert({ thread_id: thread.thread_id, sender_id: me, body: text.trim() }),
  );
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
