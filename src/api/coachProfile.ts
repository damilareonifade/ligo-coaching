import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { canToggleNotification, toggleNotification } from '@/lib/coachProfile';
import { env } from '@/lib/env';

import { ApiError, client } from './client';
import { mockCoachProfile, mockDelay, mockToggleCoachNotification } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiCoachProfile } from './types';

/* ------------------------------------------------------------------ *
 * The coach's own account.
 * ------------------------------------------------------------------ */

async function fetchCoachProfile(): Promise<ApiCoachProfile> {
  if (env.useMocks) {
    return mockDelay(mockCoachProfile());
  }
  const { data } = await client.get<ApiCoachProfile>('/coach/profile');
  return data;
}

export function useCoachProfileQuery(): UseQueryResult<ApiCoachProfile, Error> {
  return useQuery({ queryKey: queryKeys.coachProfile, queryFn: fetchCoachProfile });
}

export interface ToggleCoachNotificationInput {
  readonly id: string;
  readonly enabled: boolean;
}

async function postToggleCoachNotification({
  id,
  enabled,
}: ToggleCoachNotificationInput): Promise<void> {
  if (env.useMocks) {
    mockToggleCoachNotification(id, enabled);
    await mockDelay(undefined, 150);
    return;
  }
  await client.post('/coach/notifications', { id, enabled });
}

/**
 * Optimistic, like every other switch in the app — and refusing, unlike any of
 * them.
 *
 * The refusal is here rather than only on the switch. A disabled control is a
 * statement about a screen; this is a statement about the account, and it has
 * to hold for a caller that never rendered the screen. `mutationFn` rejects a
 * locked row before any request is made, and `onMutate` runs the same
 * `toggleNotification` the mock does, which leaves a locked row untouched — so
 * there is no path, optimistic or otherwise, that turns this notification off.
 */
export function useToggleCoachNotificationMutation(): UseMutationResult<
  void,
  Error,
  ToggleCoachNotificationInput
> {
  const queryClient = useQueryClient();
  const key = queryKeys.coachProfile;

  return useMutation({
    mutationFn: async (input: ToggleCoachNotificationInput) => {
      const current = queryClient.getQueryData<ApiCoachProfile>(key);
      const row = current?.notifications.find((candidate) => candidate.id === input.id);

      if (row && !canToggleNotification(row)) {
        throw new ApiError(
          'Permission changes cannot be muted — they change what you are allowed to do.',
          403,
        );
      }

      await postToggleCoachNotification(input);
    },
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiCoachProfile>(key);

      queryClient.setQueryData<ApiCoachProfile>(key, (current) =>
        current
          ? { ...current, notifications: toggleNotification(current.notifications, id, enabled) }
          : current,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
