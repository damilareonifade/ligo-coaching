import { useRouter } from 'expo-router';
import { MessageSquare, Trash2, UserCheck, UserMinus } from 'lucide-react-native';
import { useCallback, useState } from 'react';

import { errorMessage } from '@/api/client';
import { useLeaveGroupMutation } from '@/api/community';
import type { ApiCommunityGroup } from '@/api/types';
import LeaveSheet, { type LeaveConsequence } from '@/components/community/LeaveSheet';
import { LIButton, LICard, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

interface GroupLeaveActionProps {
  readonly group: ApiCommunityGroup;
  /**
   * The small link on the group's own header, beside the faces. Without it,
   * the full card — which is what the manage screen wants, and what somebody
   * looking for a way out will actually find.
   */
  readonly compact?: boolean;
}

/**
 * The way out of a group, wherever somebody goes looking for it.
 *
 * Shared because there are two such places and only one set of words. It is
 * on the conversation, where you are when you decide you have had enough of
 * it, and on the manage screen, which is where anybody hunting for a setting
 * looks first — and where, until now, they found members, rankings and a join
 * code but no way to leave.
 *
 * Every member has this. Leaving is not an admin power: `leave_group` asks
 * only that you are in the group, and a group you cannot get out of is not
 * one anybody should join.
 *
 * For the last admin it is not leaving at all — it deletes the group, the
 * thread and every message by cascade — so the word, the sheet and the button
 * all say so first. See `would_orphan_group`, which decides that.
 */
export default function GroupLeaveAction({ group, compact = false }: GroupLeaveActionProps) {
  const tokens = useThemeTokens();
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const leave = useLeaveGroupMutation();

  const [open, setOpen] = useState(false);
  const deletes = group.leavingDeletes;

  const confirm = useCallback(() => {
    leave.mutate(group.id, {
      onSuccess: () => {
        setOpen(false);
        router.replace('/community');
        showToast(deletes ? `${group.name} is gone.` : `You left ${group.name}.`, 'success');
      },
      onError: (error: unknown) => {
        setOpen(false);
        showToast(errorMessage(error), 'danger');
      },
    });
  }, [deletes, group.id, group.name, leave, router, showToast]);

  const consequences: readonly LeaveConsequence[] = deletes
    ? [
        {
          id: 'group',
          icon: <Trash2 color={tokens.danger} size={18} />,
          title: 'The group goes, for everyone',
          body: `All ${group.members.length} of you lose it at once, not just you.`,
        },
        {
          id: 'history',
          icon: <MessageSquare color={tokens['foreground-subtle']} size={18} />,
          // The opposite of what this sheet used to say to this person.
          title: 'Every message goes with it',
          body: 'The whole thread is deleted. Nobody keeps a copy, and the join code stops working.',
        },
        {
          id: 'handover',
          icon: <UserCheck color={tokens['foreground-subtle']} size={18} />,
          title: 'Or hand it over instead',
          body: 'Make somebody else an admin first and the group carries on without you.',
        },
      ]
    : [
        {
          id: 'membership',
          icon: <UserMinus color={tokens.danger} size={18} />,
          title: 'You leave the conversation',
          body: 'Immediately. Nothing new reaches you, and you send nothing new.',
        },
        {
          id: 'history',
          icon: <MessageSquare color={tokens['foreground-subtle']} size={18} />,
          title: 'Messages you already sent stay',
          body: 'The thread keeps its history for the members still in it.',
        },
        {
          id: 'coaching',
          icon: <UserCheck color={tokens['foreground-subtle']} size={18} />,
          // Not "X stays your coach". A group belongs to whoever made it, and
          // two clients who train together can make one with no coach in it at
          // all — at which point that sentence names somebody who is not there.
          title: 'Your coaching is unaffected',
          body: 'A group is separate from who coaches you, in both directions.',
        },
      ];

  const label = deletes ? 'Delete group' : 'Leave group';

  return (
    <>
      {compact ? (
        <LIButton
          title={deletes ? 'Delete' : 'Leave'}
          onPress={() => setOpen(true)}
          variant="outline"
          size="sm"
          shape="rounded"
          labelClassName="text-danger"
          accessibilityLabel={label}
          testID="group-leave"
        />
      ) : (
        <LICard className="gap-3">
          <LIText size="h5" color="primary" text={label} className="font-geist-semibold" />
          <LIText
            size="caption"
            color="muted"
            text={
              deletes
                ? 'You are its only admin, so leaving ends the group for everybody in it.'
                : 'You stop receiving and sending messages here. What you already said stays in the thread.'
            }
            className="font-geist"
          />
          <LIButton
            title={label}
            onPress={() => setOpen(true)}
            variant="danger"
            size="lg"
            shape="rounded"
            fullWidth
            testID="group-leave"
          />
        </LICard>
      )}

      <LeaveSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={deletes ? `Delete ${group.name}?` : `Leave ${group.name}?`}
        body={
          deletes
            ? 'You are its only admin, so leaving ends it. This cannot be undone.'
            : 'You can be invited back, but you will not see what was said while you were gone.'
        }
        consequences={consequences}
        confirmTitle={label}
        onConfirm={confirm}
        loading={leave.isPending}
        testID="group-leave-sheet"
      />
    </>
  );
}
