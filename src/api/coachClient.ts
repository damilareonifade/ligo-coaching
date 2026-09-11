import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { markRequested } from '@/lib/clientReview';
import { env } from '@/lib/env';
import { deriveRosterStats, withLabelCounts } from '@/lib/roster';

import { ApiError, client } from './client';
import {
  mockClientReview,
  mockDelay,
  mockLiveSession,
  mockRequestAccess,
  mockSetClientLabel,
} from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiClientReview, ApiLiveSession, ApiReviewDomain, ApiRoster } from './types';

/* ------------------------------------------------------------------ *
 * The coach's view of one client.
 *
 * Two reads and two writes, and the writes are deliberately small.
 * Nothing here can widen what the coach sees: setting a label files a
 * row on the coach's own side, and requesting access records a
 * question. The one thing that changes what a coach can see is a
 * client answering it, on their own screen, in their own app.
 * ------------------------------------------------------------------ */

async function fetchClientReview(clientId: string): Promise<ApiClientReview> {
  if (env.useMocks) {
    const review = mockClientReview(clientId);
    if (!review) throw new ApiError('That client is no longer on your roster.', 404);
    return mockDelay(review);
  }
  const { data } = await client.get<ApiClientReview>(`/coach/clients/${clientId}/review`);
  return data;
}

export function useClientReviewQuery(clientId: string): UseQueryResult<ApiClientReview, Error> {
  return useQuery({
    queryKey: queryKeys.coachClient.review(clientId),
    queryFn: () => fetchClientReview(clientId),
    enabled: clientId.length > 0,
  });
}

export interface SetClientLabelInput {
  readonly clientId: string;
  /** `null` unfiles them. A label is the coach's filing, never a permission. */
  readonly labelId: string | null;
}

async function putClientLabel({ clientId, labelId }: SetClientLabelInput): Promise<void> {
  if (env.useMocks) {
    mockSetClientLabel(clientId, labelId);
    await mockDelay(undefined, 200);
    return;
  }
  await client.put(`/coach/roster/clients/${clientId}/label`, { labelId });
}

/**
 * Optimistic on both caches at once, and that pairing is the point.
 *
 * The chip has to land under the thumb, like every other label write. But the
 * coach usually taps it on the way back to the roster, so the roster's own
 * copy — its groups, its label counts — is patched in the same beat. Counts
 * are recomposed rather than incremented, exactly as src/api/roster.ts does,
 * so the optimistic roster is the roster the refetch will hand back.
 */
export function useSetClientLabelMutation(): UseMutationResult<
  void,
  Error,
  SetClientLabelInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: putClientLabel,
    onMutate: async ({ clientId, labelId }) => {
      const reviewKey = queryKeys.coachClient.review(clientId);
      const rosterKey = queryKeys.roster;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: reviewKey }),
        queryClient.cancelQueries({ queryKey: rosterKey }),
      ]);

      const previousReview = queryClient.getQueryData<ApiClientReview>(reviewKey);
      const previousRoster = queryClient.getQueryData<ApiRoster>(rosterKey);

      queryClient.setQueryData<ApiClientReview>(reviewKey, (current) =>
        current ? { ...current, labelId } : current,
      );

      queryClient.setQueryData<ApiRoster>(rosterKey, (current) => {
        if (!current) return current;
        const clients = current.clients.map((entry) =>
          entry.id === clientId ? { ...entry, labelId } : entry,
        );
        return {
          ...current,
          stats: deriveRosterStats(clients),
          clients,
          labels: withLabelCounts(current.labels, clients),
        };
      });

      return { previousReview, previousRoster, reviewKey, rosterKey };
    },
    onError: (_error, _input, context) => {
      if (!context) return;
      if (context.previousReview) {
        queryClient.setQueryData(context.reviewKey, context.previousReview);
      }
      if (context.previousRoster) {
        queryClient.setQueryData(context.rosterKey, context.previousRoster);
      }
    },
    onSettled: (_data, _error, { clientId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachClient.review(clientId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.roster });
    },
  });
}

export interface RequestAccessInput {
  readonly clientId: string;
  readonly domainId: ApiReviewDomain['id'];
}

async function postAccessRequest({ clientId, domainId }: RequestAccessInput): Promise<void> {
  if (env.useMocks) {
    mockRequestAccess(clientId, domainId);
    await mockDelay(undefined, 300);
    return;
  }
  await client.post(`/coach/clients/${clientId}/access-requests`, { domain: domainId });
}

/**
 * Optimistic, and it flips a domain to `requested` and nothing else.
 *
 * `markRequested` will not touch a granted domain, so the worst a race here
 * can do is show "Requested" under a card that is already shared — it cannot
 * open one that is not. The button going flat immediately matters for a
 * different reason than usual: a coach who taps twice has asked twice, and the
 * client is the one who hears about it.
 */
export function useRequestAccessMutation(): UseMutationResult<void, Error, RequestAccessInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postAccessRequest,
    onMutate: async ({ clientId, domainId }) => {
      const key = queryKeys.coachClient.review(clientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientReview>(key);

      queryClient.setQueryData<ApiClientReview>(key, (current) =>
        current ? { ...current, domains: markRequested(current.domains, domainId) } : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, { clientId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachClient.review(clientId) });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The live session.
 * ------------------------------------------------------------------ */

async function fetchLiveSession(clientId: string): Promise<ApiLiveSession | null> {
  if (env.useMocks) {
    return mockDelay(mockLiveSession(clientId));
  }
  const { data } = await client.get<ApiLiveSession | null>(`/coach/clients/${clientId}/live`);
  return data;
}

/**
 * Polls while the screen is open, because the promise on it is that sets
 * appear as they are logged. `null` is a valid answer, not an error: the
 * session ended, and the screen has a state that says so.
 */
export function useLiveSessionQuery(
  clientId: string,
): UseQueryResult<ApiLiveSession | null, Error> {
  return useQuery({
    queryKey: queryKeys.coachClient.live(clientId),
    queryFn: () => fetchLiveSession(clientId),
    enabled: clientId.length > 0,
    refetchInterval: 15_000,
  });
}
