import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useAddGroupBoardMutation,
  useRemoveGroupBoardMutation,
  useRemoveGroupMemberMutation,
  useSetGroupAdminMutation,
} from '@/api/community';
import type { ApiCommunityGroup, BoardMetric } from '@/api/types';
import GroupLeaveAction from '@/components/community/GroupLeaveAction';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

import ManageBoards from './ManageBoards';
import ManageJoinCode from './ManageJoinCode';
import ManageMembers from './ManageMembers';

interface ManageContentProps {
  readonly group: ApiCommunityGroup;
}

/**
 * Who is in a group, what it ranks, and how somebody else gets in.
 *
 * A route rather than a sheet on the conversation. Every action here changes
 * what other people can see or can do — promoting somebody, removing them,
 * adding a ranking the whole group is then asked about — and those belong
 * somewhere with a back button rather than somewhere a stray swipe dismisses.
 * `LIDialog`'s own note makes the same argument about confirmations.
 *
 * Five database functions had no caller before this screen: a group could be
 * created and then never changed.
 *
 * Leaving is last, under everything else, because it is the one thing here
 * that cannot be undone — and it is on this screen at all because this is
 * where somebody hunting for a way out looks first. The small link on the
 * conversation's header is easy to miss and was, for a while, the only one.
 */
export default function ManageContent({ group }: ManageContentProps) {
  const router = useRouter();
  const meId = useAuthStore((state) => state.user?.id) ?? '';
  const showToast = useUiStore((state) => state.showToast);

  const addBoard = useAddGroupBoardMutation();
  const removeBoard = useRemoveGroupBoardMutation();
  const setAdmin = useSetGroupAdminMutation();
  const removeMember = useRemoveGroupMemberMutation();

  const fail = useCallback(
    (error: unknown) => showToast(errorMessage(error), 'danger'),
    [showToast],
  );

  const handleAddBoard = useCallback(
    (metric: BoardMetric) => {
      addBoard.mutate({ groupId: group.id, metric }, { onError: fail });
    },
    [addBoard, fail, group.id],
  );

  const handleRemoveBoard = useCallback(
    (boardId: string) => {
      removeBoard.mutate({ groupId: group.id, boardId }, { onError: fail });
    },
    [fail, group.id, removeBoard],
  );

  const handleSetAdmin = useCallback(
    (userId: string, admin: boolean) => {
      setAdmin.mutate(
        { groupId: group.id, userId, admin },
        {
          onError: fail,
          onSuccess: () => showToast(admin ? 'They can run this group now.' : 'Admin removed.', 'success'),
        },
      );
    },
    [fail, group.id, setAdmin, showToast],
  );

  const handleRemoveMember = useCallback(
    (userId: string) => {
      removeMember.mutate({ groupId: group.id, userId }, { onError: fail });
    },
    [fail, group.id, removeMember],
  );

  const openBoard = useCallback(
    (boardId: string) => router.push(`/community/board/${boardId}`),
    [router],
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-10 pt-2">
      <ManageMembers
        members={group.members}
        meId={meId}
        isAdmin={group.isAdmin}
        onSetAdmin={handleSetAdmin}
        onRemove={handleRemoveMember}
        busyId={setAdmin.isPending ? setAdmin.variables?.userId : undefined}
      />

      <ManageBoards
        boards={group.boards}
        isAdmin={group.isAdmin}
        onAdd={handleAddBoard}
        onRemove={handleRemoveBoard}
        onOpen={openBoard}
        busy={addBoard.isPending}
      />

      <ManageJoinCode code={group.joinCode} />

      <GroupLeaveAction group={group} />
    </ScrollView>
  );
}
