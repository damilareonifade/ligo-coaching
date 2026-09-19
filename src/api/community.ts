import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import {
  BOARD_METRIC_OPTIONS,
  boardMetricLabel,
  boardValueLabel,
  boardWindowLabel,
  deltaLabel,
  deriveBoardStats,
  GROUP_HIDDEN_ALWAYS,
  GROUP_VISIBLE_TO_MEMBERS,
} from '@/lib/community';
import { useSettingsStore } from '@/store/settingsStore';
import { formatChatStamp, initials } from '@/lib/format';

import { ApiError } from './client';
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
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type {
  ApiCoachGroupSummary,
  ApiCommunity,
  ApiCommunityBoard,
  ApiCommunityGroup,
  BoardMetric,
  BoardWindow,
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

  const now = new Date();
  const [groupRows, inviteRows, boardRows] = await Promise.all([
    supabase.rpc('my_groups').then(unwrap),
    supabase.rpc('my_group_invites').then(unwrap),
    supabase.rpc('my_boards').then(unwrap),
  ]);

  return {
    invites: inviteRows.map((row) => ({
      id: row.invite_id ?? '',
      kind: 'group' as const,
      targetId: row.group_id ?? '',
      name: row.group_name ?? '',
      ownerName: row.invited_by_name ?? '',
      summary: `${row.member_count ?? 0} members`,
      // Composed here rather than sent: these are the app's promises about
      // its own behaviour, and they belong where a test can hold them to
      // their exact words — see the note at the top of lib/community.ts.
      visible: GROUP_VISIBLE_TO_MEMBERS,
      hidden: GROUP_HIDDEN_ALWAYS,
    })),
    groups: groupRows.map((row) => ({
      id: row.group_id ?? '',
      name: row.name ?? '',
      ownerName: row.owner_name ?? '',
      memberCount: row.member_count ?? 0,
      preview: row.last_body ?? '',
      when: row.last_at ? formatChatStamp(row.last_at, now) : '',
    })),
    boards: boardRows.map((row) => {
      const metric = (row.metric ?? 'volume') as BoardMetric;
      return {
        id: row.board_id ?? '',
        // Named for its group, since a ranking has no name of its own.
        name: row.group_name ?? '',
        ownerName:
          groupRows.find((g) => g.group_id === row.group_id)?.owner_name ?? '',
        metricLabel: BOARD_METRIC_OPTIONS.find((o) => o.id === metric)?.label ?? '',
        optedIn: row.opted_in ?? false,
        standing: row.opted_in
          ? `${row.member_count ?? 0} ranked`
          : 'Not on this one',
      };
    }),
  };
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
  const [me, groupRows, memberRows, messageRows, boardRows, orphans] = await Promise.all([
    currentUserId(),
    supabase.rpc('my_groups').then(unwrap),
    supabase.rpc('group_members', { p_group_id: id }).then(unwrap),
    supabase.rpc('group_messages', { p_group_id: id }).then(unwrap),
    supabase.rpc('my_boards').then(unwrap),
    // In the same round trip as the rest, and until now it had no caller at
    // all: the leave sheet promised "the thread keeps its history for the
    // members still in it" to somebody whose leaving was about to delete both.
    supabase.rpc('would_orphan_group', { p_group_id: id }).then(unwrap),
  ]);

  const group = groupRows.find((row) => row.group_id === id);
  if (!group) throw new ApiError('That group is no longer available.', 404);

  const now = new Date();

  return {
    id,
    name: group.name ?? '',
    joinCode: group.join_code ?? '',
    isAdmin: group.is_admin ?? false,
    leavingDeletes: orphans ?? false,
    boards: boardRows
      .filter((row) => row.group_id === id)
      .map((row) => {
        const metric = (row.metric ?? 'volume') as BoardMetric;
        return {
          id: row.board_id ?? '',
          metric,
          label: BOARD_METRIC_OPTIONS.find((o) => o.id === metric)?.label ?? '',
          optedIn: row.opted_in ?? false,
          rankedCount: row.member_count ?? 0,
        };
      }),
    ownerName: group.owner_name ?? '',
    myIdentity: (group.my_identity ?? 'first') as CommunityIdentity,
    myDisplayName: group.my_display_name ?? '',
    members: memberRows.map((row) => ({
      clientId: row.user_id ?? '',
      // Already resolved through that member's own choice, server-side. The
      // real name is not in this payload and must not be — see
      // `community_display_name`.
      displayName: row.display_name ?? '',
      initials: initials(row.display_name ?? ''),
      isCoach: row.is_coach ?? false,
      isAdmin: row.is_admin ?? false,
    })),
    messages: messageRows.map((row) => ({
      id: row.id ?? '',
      senderId: row.sender_id ?? '',
      senderName: row.sender_name ?? '',
      isCoach: row.is_coach ?? false,
      text: row.body ?? '',
      when: formatChatStamp(row.created_at ?? '', now),
      from: row.sender_id === me ? ('me' as const) : ('them' as const),
    })),
  };
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
  const [me, boardRows, groupRows] = await Promise.all([
    currentUserId(),
    supabase.rpc('my_boards').then(unwrap),
    supabase.rpc('my_groups').then(unwrap),
  ]);

  // `id` is a ranking's id, not a group's. A group holds one row per metric it
  // ranks, and each is its own board with its own people on it.
  const board = boardRows.find((row) => row.board_id === id);
  if (!board) throw new ApiError('That leaderboard is no longer available.', 404);

  const group = groupRows.find((row) => row.group_id === board.group_id);

  const [standings, notOptedIn, window] = await Promise.all([
    supabase.rpc('board_standings', { p_board_id: id }).then(unwrap),
    supabase.rpc('board_not_opted_in', { p_board_id: id }).then(unwrap),
    supabase
      .from('groups')
      .select('board_window, board_from, board_to')
      .eq('id', board.group_id ?? '')
      .single()
      .then(unwrap),
  ]);

  const metric = (board.metric ?? 'volume') as BoardMetric;
  const windowLabel = boardWindowLabel(
    (window.board_window ?? 'month') as BoardWindow,
    window.board_from ?? '',
    window.board_to ?? '',
  );
  // Read from the store rather than `useUnits`, which is a hook and cannot be
  // called here. Same as `clientProfile.ts` does for the settings sync.
  const unit = useSettingsStore.getState().unit;
  const mine = standings.find((row) => row.user_id === me);

  const rows = standings.map((row) => ({
    rank: row.rank ?? 0,
    displayName: row.display_name ?? '',
    initials: initials(row.display_name ?? ''),
    value: boardValueLabel(metric, Number(row.value ?? 0), unit),
    sub: '',
    // Where they stood in the newest week older than this one — see
    // `board_rank_snapshots`, written weekly. Null while there is no earlier
    // week, which `deltaLabel` renders as the dash this always used to be.
    delta: deltaLabel(row.delta ?? null),
    isMe: row.user_id === me,
  }));

  return {
    id,
    // The group's name, because a ranking has none of its own — what it ranks
    // is the metric label under it.
    name: board.group_name ?? '',
    ownerName: group?.owner_name ?? '',
    metricLabel: boardMetricLabel(metric, windowLabel),
    windowLabel,
    optedIn: Boolean(mine),
    myIdentity: 'first' as CommunityIdentity,
    stats: deriveBoardStats(rows),
    rows,
    invitedNotOptedIn: notOptedIn ?? 0,
    facts: [
      { label: 'Metric', value: BOARD_METRIC_OPTIONS.find((o) => o.id === metric)?.label ?? '' },
      { label: 'Window', value: windowLabel },
      { label: 'Visible to', value: `${group?.member_count ?? 0} members` },
      { label: 'Updates', value: 'Live' },
    ],
  };
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
  const now = new Date();
  const rows = await supabase.rpc('my_groups').then(unwrap);

  // Every group they are in, not only the ones they run. A coach invited into
  // a client's group is in that conversation and should see it where they see
  // their others; "runs" is `is_admin`, and it decides what they may do rather
  // than what they may read.
  return rows.map((row) => ({
    id: row.group_id ?? '',
    name: row.name ?? '',
    memberCount: row.member_count ?? 0,
    preview: row.last_body ?? '',
    when: row.last_at ? formatChatStamp(row.last_at, now) : '',
  }));
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
  const [me, rows] = await Promise.all([
    currentUserId(),
    supabase.rpc('my_groups').then(unwrap),
  ]);

  const group = rows.find((row) => row.group_id === groupId);
  if (!group) throw new ApiError('That group is no longer available.', 404);

  assertOk(
    await supabase
      .from('messages')
      .insert({ thread_id: group.thread_id, sender_id: me, body: text.trim() }),
  );
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

export interface AcceptInviteInput {
  readonly inviteId: string;
  /**
   * How they will appear to the other members. Answered on the invite screen
   * now; it used to be sent as `'first'` whatever they would have said, which
   * was the app making a per-group privacy choice on somebody's behalf and
   * then never offering to revisit it — nothing updates a group identity once
   * it is written.
   *
   * Ignored by a board invitation, which leads to its own opt-in and asks
   * there, against that board's own facts.
   */
  readonly identity: CommunityIdentity;
  readonly handle: string;
}

async function postAcceptInvite({
  inviteId,
  identity,
  handle,
}: AcceptInviteInput): Promise<void> {
  if (env.useMocks) {
    mockAcceptInvite(inviteId, identity, handle);
    await mockDelay(undefined, 300);
    return;
  }
  assertOk(
    await supabase.rpc('respond_to_group_invite', {
      p_invite_id: inviteId,
      p_accept: true,
      p_identity: identity,
      p_handle: handle.trim() === '' ? null : handle.trim(),
    }),
  );
}

export function useAcceptInviteMutation(): UseMutationResult<void, Error, AcceptInviteInput> {
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
  assertOk(
    await supabase.rpc('respond_to_group_invite', {
      p_invite_id: inviteId,
      p_accept: false,
    }),
  );
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
  assertOk(
    await supabase.rpc('join_board', {
      p_board_id: boardId,
      p_identity: identity,
      p_handle: handle.trim().length > 0 ? handle.trim() : undefined,
    }),
  );
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
  const me = await currentUserId();
  assertOk(
    await supabase.from('board_members').delete().eq('board_id', boardId).eq('user_id', me),
  );
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
  assertOk(await supabase.rpc('leave_group', { p_group_id: groupId }));
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

/** Returns the new group's id — the maker is sent to it to find its code. */
async function postCreateGroup({ name, clientIds }: CreateGroupInput): Promise<string> {
  if (env.useMocks) {
    const id = mockCreateGroup({ name, clientIds });
    await mockDelay(undefined, 450);
    return id;
  }
  const groupId = await supabase
    .rpc('create_group', { p_name: name.trim(), p_identity: 'first' })
    .then(unwrap);

  // Two statements rather than one, and in this order on purpose: the group
  // exists whether or not anybody answers, and a create that rolled back
  // because an invitation could not be sent would lose a group its maker is
  // already in.
  if (clientIds.length > 0) {
    assertOk(
      await supabase.rpc('invite_to_group', {
        p_group_id: groupId,
        p_user_ids: [...clientIds],
      }),
    );
  }

  return groupId;
}

export function useCreateGroupMutation(): UseMutationResult<string, Error, CreateGroupInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCreateGroup,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.coachGroups });
      // The client's own list of groups, which this used to leave stale — a
      // client who made a group went back to Community and did not see it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
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
  // A ranking lives inside a group, so this makes the group and adds one to
  // it. `CommunityCreateSheet` should really not offer this as a second kind
  // of thing to create — that is a screen change, not an API one.
  const groupId = await supabase
    .rpc('create_group', { p_name: input.name.trim(), p_identity: 'first' })
    .then(unwrap);

  assertOk(
    await supabase.rpc('add_group_board', { p_group_id: groupId, p_metric: input.metric }),
  );

  if (input.clientIds.length > 0) {
    assertOk(
      await supabase.rpc('invite_to_group', {
        p_group_id: groupId,
        p_user_ids: [...input.clientIds],
      }),
    );
  }
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

/* ------------------------------------------------------------------ *
 * Running a group.
 *
 * Every one of these has existed in the database since groups did and
 * had no caller at all — which is why a group could be made and then
 * never changed: no ranking added, nobody promoted, nobody removed.
 *
 * None is optimistic. Each changes what other people can see or do,
 * and a change of that kind that appears to have landed and then rolls
 * back is worse than a button that takes a moment.
 * ------------------------------------------------------------------ */

function useGroupMutation<TInput>(
  mutationFn: (input: TInput) => Promise<void>,
  groupId: (input: TInput) => string,
): UseMutationResult<void, Error, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.group(groupId(input)) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.community.overview });
    },
  });
}

export interface AddGroupBoardInput {
  readonly groupId: string;
  readonly metric: BoardMetric;
}

export function useAddGroupBoardMutation(): UseMutationResult<void, Error, AddGroupBoardInput> {
  return useGroupMutation(async ({ groupId, metric }) => {
    if (env.useMocks) {
      await mockDelay(undefined, 300);
      return;
    }
    assertOk(await supabase.rpc('add_group_board', { p_group_id: groupId, p_metric: metric }));
  }, (input) => input.groupId);
}

export interface RemoveGroupBoardInput {
  readonly groupId: string;
  readonly boardId: string;
}

export function useRemoveGroupBoardMutation(): UseMutationResult<
  void,
  Error,
  RemoveGroupBoardInput
> {
  return useGroupMutation(async ({ boardId }) => {
    if (env.useMocks) {
      await mockDelay(undefined, 300);
      return;
    }
    assertOk(await supabase.rpc('remove_group_board', { p_board_id: boardId }));
  }, (input) => input.groupId);
}

export interface SetGroupAdminInput {
  readonly groupId: string;
  readonly userId: string;
  readonly admin: boolean;
}

export function useSetGroupAdminMutation(): UseMutationResult<void, Error, SetGroupAdminInput> {
  return useGroupMutation(async ({ groupId, userId, admin }) => {
    if (env.useMocks) {
      await mockDelay(undefined, 300);
      return;
    }
    assertOk(
      await supabase.rpc('set_group_admin', {
        p_group_id: groupId,
        p_user_id: userId,
        p_admin: admin,
      }),
    );
  }, (input) => input.groupId);
}

export interface RemoveGroupMemberInput {
  readonly groupId: string;
  readonly userId: string;
}

export function useRemoveGroupMemberMutation(): UseMutationResult<
  void,
  Error,
  RemoveGroupMemberInput
> {
  return useGroupMutation(async ({ groupId, userId }) => {
    if (env.useMocks) {
      await mockDelay(undefined, 300);
      return;
    }
    assertOk(
      await supabase.rpc('remove_group_member', { p_group_id: groupId, p_user_id: userId }),
    );
  }, (input) => input.groupId);
}
