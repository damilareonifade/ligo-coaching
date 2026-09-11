import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { ApiError, client } from './client';
import {
  mockAcceptInvite,
  mockCoachGroups,
  mockCommunity,
  mockCommunityBoard,
  mockCommunityGroup,
  mockCreateBoard,
  mockCreateGroup,
  mockDeclineInvite,
  mockDelay,
  mockJoinBoard,
  mockLeaveBoard,
  mockLeaveGroup,
  mockSendGroupMessage,
} from './mocks';
import { queryKeys } from './queryKeys';
import type {
  ApiCoachGroupSummary,
  ApiCommunity,
  ApiCommunityBoard,
  ApiCommunityGroup,
  BoardMetric,
  CommunityIdentity,
} from './types';

/* ------------------------------------------------------------------ *
 * Community. Groups and boards are plural by nature, which is exactly
 * what makes them the hardest place to keep the app's one rule:
 * nothing about a client is visible until that client says so.
 *
 * So the writes here are asymmetric on purpose. A coach's create is
 * an *invite* — it can put a board on someone's screen and nothing
 * else. Only the client's own join and accept can put them in it, and
 * those carry the identity they picked. There is no endpoint in this
 * module through which a coach can add a person to anything.
 * ------------------------------------------------------------------ */

async function fetchCommunity(): Promise<ApiCommunity> {
  if (env.useMocks) {
    return mockDelay(mockCommunity());
  }
  const { data } = await client.get<ApiCommunity>('/community');
  return data;
}

/** The client's index: what they are in, and what they have been asked to. */
export function useCommunityQuery(): UseQueryResult<ApiCommunity, Error> {
  return useQuery({ queryKey: queryKeys.community.overview, queryFn: fetchCommunity });
}

async function fetchGroup(id: string): Promise<ApiCommunityGroup> {
  if (env.useMocks) {
    const group = mockCommunityGroup(id);
    if (!group) throw new ApiError('That group is no longer available.', 404);
    return mockDelay(group);
  }
  const { data } = await client.get<ApiCommunityGroup>(`/community/groups/${id}`);
  return data;
}

/**
 * One group, read from whichever seat is holding the phone. `from` and
 * `myDisplayName` are composed server-side against the caller's token, the
 * same way the 1:1 thread is — so the coach and the six clients are reading
 * one conversation, not six copies of it.
 */
export function useGroupQuery(id: string): UseQueryResult<ApiCommunityGroup, Error> {
  return useQuery({
    queryKey: queryKeys.community.group(id),
    queryFn: () => fetchGroup(id),
    enabled: id.length > 0,
  });
}

async function fetchBoard(id: string): Promise<ApiCommunityBoard> {
  if (env.useMocks) {
    const board = mockCommunityBoard(id);
    if (!board) throw new ApiError('That leaderboard is no longer available.', 404);
    return mockDelay(board);
  }
  const { data } = await client.get<ApiCommunityBoard>(`/community/boards/${id}`);
  return data;
}

export function useBoardQuery(id: string): UseQueryResult<ApiCommunityBoard, Error> {
  return useQuery({
    queryKey: queryKeys.community.board(id),
    queryFn: () => fetchBoard(id),
    enabled: id.length > 0,
  });
}

async function fetchCoachGroups(): Promise<readonly ApiCoachGroupSummary[]> {
  if (env.useMocks) {
    return mockDelay(mockCoachGroups());
  }
  const { data } = await client.get<readonly ApiCoachGroupSummary[]>('/coach/community/groups');
  return data;
}

/** The groups a coach runs, listed above their 1:1 threads in the inbox. */
export function useCoachGroupsQuery(): UseQueryResult<readonly ApiCoachGroupSummary[], Error> {
  return useQuery({ queryKey: queryKeys.community.coachGroups, queryFn: fetchCoachGroups });
}

/* ------------------------------------------------------------------ *
 * Messaging
 * ------------------------------------------------------------------ */

export interface SendGroupMessageInput {
  readonly groupId: string;
  readonly text: string;
  /** Shown above the optimistic bubble, so it is labelled like every other. */
  readonly senderName: string;
  readonly isCoach: boolean;
}

async function postGroupMessage({ groupId, text }: SendGroupMessageInput): Promise<void> {
  if (env.useMocks) {
    mockSendGroupMessage(groupId, text);
    await mockDelay(undefined, 250);
    return;
  }
  await client.post(`/community/groups/${groupId}/messages`, { text });
}

/**
 * Optimistic, exactly as the 1:1 threads are: a message that waits for the
 * network reads as a message that did not send, and the reflex is to send it
 * twice — which in a group of seven is a mistake six other people watch happen.
 *
 * The optimistic message carries the sender's *display* name, not their real
 * one, because that is what the other members will see and what the thread
 * should therefore show back immediately.
 */
export function useSendGroupMessageMutation(): UseMutationResult<
  void,
  Error,
  SendGroupMessageInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postGroupMessage,
    onMutate: async ({ groupId, text, senderName, isCoach }) => {
      const key = queryKeys.community.group(groupId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiCommunityGroup>(key);

      queryClient.setQueryData<ApiCommunityGroup>(key, (current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages,
                {
                  id: `optimistic-${Date.now()}`,
                  senderId: 'me',
                  senderName,
                  isCoach,
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
    onSettled: (_data, _error, { groupId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.group(groupId) });
      // The index carries this group's preview line; it is the server's to
      // recompose, so it is invalidated rather than guessed at.
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.coachGroups });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The client's own decisions. Each of these is someone answering for
 * themselves, so none of them is optimistic: a consent that appears
 * to have landed and then silently rolls back is worse than a button
 * that takes a moment.
 * ------------------------------------------------------------------ */

async function postAcceptInvite(inviteId: string): Promise<void> {
  if (env.useMocks) {
    mockAcceptInvite(inviteId);
    await mockDelay(undefined, 300);
    return;
  }
  await client.post(`/community/invites/${inviteId}/accept`);
}

export function useAcceptInviteMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postAcceptInvite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}

async function postDeclineInvite(inviteId: string): Promise<void> {
  if (env.useMocks) {
    mockDeclineInvite(inviteId);
    await mockDelay(undefined, 300);
    return;
  }
  await client.post(`/community/invites/${inviteId}/decline`);
}

/**
 * Declining sends the id and nothing else. There is no reason field here and
 * there is not meant to be one: the coach is told who accepted, and a decline
 * is simply the absence of that — not a message with a shape of its own.
 */
export function useDeclineInviteMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postDeclineInvite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}

export interface JoinBoardInput {
  readonly boardId: string;
  readonly identity: CommunityIdentity;
  /** Only meaningful for the `handle` identity; empty otherwise. */
  readonly handle: string;
}

async function postJoinBoard({ boardId, identity, handle }: JoinBoardInput): Promise<void> {
  if (env.useMocks) {
    mockJoinBoard({ boardId, identity, handle });
    await mockDelay(undefined, 400);
    return;
  }
  await client.post(`/community/boards/${boardId}/join`, { identity, handle });
}

/**
 * The identity travels with the join and is stored against this board alone.
 * Joining a second board asks again from scratch — appearing as "Maya A."
 * among six people is not consent to appear as "Maya A." among thirty.
 */
export function useJoinBoardMutation(): UseMutationResult<void, Error, JoinBoardInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postJoinBoard,
    onSuccess: (_data, { boardId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.board(boardId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}

async function deleteBoardMembership(boardId: string): Promise<void> {
  if (env.useMocks) {
    mockLeaveBoard(boardId);
    await mockDelay(undefined, 300);
    return;
  }
  await client.delete(`/community/boards/${boardId}/me`);
}

/** Leaving takes the row off the board and touches nothing else. */
export function useLeaveBoardMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBoardMembership,
    onSuccess: (_data, boardId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.board(boardId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}

async function deleteGroupMembership(groupId: string): Promise<void> {
  if (env.useMocks) {
    mockLeaveGroup(groupId);
    await mockDelay(undefined, 300);
    return;
  }
  await client.delete(`/community/groups/${groupId}/me`);
}

export function useLeaveGroupMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroupMembership,
    onSuccess: (_data, groupId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.group(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The coach's creates. Both of these send invitations and nothing
 * more — there is no field on either input that adds a member.
 * ------------------------------------------------------------------ */

export interface CreateGroupInput {
  readonly name: string;
  /** Roster client ids to invite. Nobody is added; everybody is asked. */
  readonly clientIds: readonly string[];
}

async function postCreateGroup({ name, clientIds }: CreateGroupInput): Promise<void> {
  if (env.useMocks) {
    mockCreateGroup({ name, clientIds });
    await mockDelay(undefined, 450);
    return;
  }
  await client.post('/coach/community/groups', { name: name.trim(), invite: clientIds });
}

export function useCreateGroupMutation(): UseMutationResult<void, Error, CreateGroupInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCreateGroup,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.coachGroups });
    },
  });
}

export interface CreateBoardInput {
  readonly name: string;
  readonly metric: BoardMetric;
  readonly metricLabel: string;
  readonly windowLabel: string;
  readonly clientIds: readonly string[];
}

async function postCreateBoard(input: CreateBoardInput): Promise<void> {
  if (env.useMocks) {
    mockCreateBoard(input);
    await mockDelay(undefined, 450);
    return;
  }
  await client.post('/coach/community/boards', {
    name: input.name.trim(),
    metric: input.metric,
    window: input.windowLabel,
    invite: input.clientIds,
  });
}

export function useCreateBoardMutation(): UseMutationResult<void, Error, CreateBoardInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCreateBoard,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.coachGroups });
    },
  });
}
