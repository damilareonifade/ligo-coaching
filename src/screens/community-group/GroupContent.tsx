import { useRouter } from 'expo-router';
import { MessageSquare, Trash2, UserCheck, UserMinus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useLeaveGroupMutation, useSendGroupMessageMutation } from '@/api/community';
import type { ApiCommunityGroup } from '@/api/types';
import { groupOwnerLine, labelGroupMessages } from '@/lib/community';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatThread from '@/components/chat/ChatThread';
import LeaveSheet, { type LeaveConsequence } from '@/components/community/LeaveSheet';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

import GroupHeaderCard from './GroupHeaderCard';
import GroupVisibilityNotice from './GroupVisibilityNotice';

interface GroupContentProps {
  readonly group: ApiCommunityGroup;
}

/**
 * The third seat on the shared chat components, after the client's thread with
 * their coach and the coach's thread with one client. Everything visible in
 * the thread below the header is the same `ChatThread` and `ChatComposer` the
 * other two use; this file is the wiring, plus the two things a group needs
 * that a pair does not — who is in it, and how to get out.
 *
 * `LIForm` gives no keyboard avoidance, so the screen owns it. The header and
 * the visibility notice sit outside the thread so they stay put while typing:
 * the count of people reading should not scroll away mid-sentence.
 */
export default function GroupContent({ group }: GroupContentProps) {
  const tokens = useThemeTokens();
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const role = useAuthStore((state) => state.user?.role);
  const send = useSendGroupMessageMutation();
  const leave = useLeaveGroupMutation();

  const [leaving, setLeaving] = useState(false);

  const isCoach = role === 'coach';
  const messages = useMemo(() => labelGroupMessages(group.messages), [group.messages]);

  const handleSend = useCallback(
    (text: string) =>
      send.mutateAsync({
        groupId: group.id,
        text,
        // The name the other members will see, not the one on the account.
        senderName: group.myDisplayName,
        isCoach,
      }),
    [group.id, group.myDisplayName, isCoach, send],
  );

  const openManage = useCallback(
    () => router.push(`/community/group/${group.id}/manage`),
    [group.id, router],
  );

  // Leaving and deleting are the same act here, and which one it is depends
  // on whether anybody is left to run the group. `leave_group` decides that
  // in the database; this decides what the person is told before it does.
  const deletes = group.leavingDeletes;

  const confirmLeave = useCallback(() => {
    leave.mutate(group.id, {
      onSuccess: () => {
        setLeaving(false);
        router.replace('/community');
        showToast(deletes ? `${group.name} is gone.` : `You left ${group.name}.`, 'success');
      },
      onError: (error: unknown) => {
        setLeaving(false);
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

  // A coach is a member of their own group like anybody else — `create_group`
  // puts its maker in the thread as its first member and first admin — so the
  // seat that had no way out now leaves by the same door. It was scoped out
  // while groups were something a coach made for a roster; they are anyone's
  // now, and a group its maker cannot leave or end is one nobody can.
  const context = isCoach
    ? `You run this group · ${group.members.length - 1} others in it`
    : groupOwnerLine(group.ownerName, group.myDisplayName);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="gap-3 px-4 pt-2">
        <GroupHeaderCard
        onManage={openManage}
          members={group.members}
          context={context}
          onLeave={() => setLeaving(true)}
          leaveLabel={deletes ? 'Delete' : 'Leave'}
        />
        <GroupVisibilityNotice memberCount={group.members.length} />
      </View>

      <View className="flex-1">
        <ChatThread
          messages={messages}
          emptyMessage={
            isCoach
              ? 'Nobody has written yet. Whatever you post here is read by every member who accepted.'
              : `Nothing here yet. Anything you post is read by all ${group.members.length} members.`
          }
          testID="group-thread"
        />
      </View>

      <ChatComposer onSend={handleSend} isPending={send.isPending} placeholder="Message the group" />

      <LeaveSheet
        visible={leaving}
        onClose={() => setLeaving(false)}
        title={deletes ? `Delete ${group.name}?` : `Leave ${group.name}?`}
        body={
          deletes
            ? 'You are its only admin, so leaving ends it. This cannot be undone.'
            : 'You can be invited back, but you will not see what was said while you were gone.'
        }
        consequences={consequences}
        confirmTitle={deletes ? 'Delete group' : 'Leave group'}
        onConfirm={confirmLeave}
        loading={leave.isPending}
        testID="group-leave-sheet"
      />
    </KeyboardAvoidingView>
  );
}
