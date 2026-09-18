import { useRouter } from 'expo-router';
import { MessageSquare, UserCheck, UserMinus } from 'lucide-react-native';
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

  const confirmLeave = useCallback(() => {
    leave.mutate(group.id, {
      onSuccess: () => {
        setLeaving(false);
        router.replace('/community');
      },
      onError: (error: unknown) => {
        setLeaving(false);
        showToast(errorMessage(error), 'danger');
      },
    });
  }, [group.id, leave, router, showToast]);

  const consequences: readonly LeaveConsequence[] = [
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
      // Not "X stays your coach". A group belongs to whoever made it, and two
      // clients who train together can make one with no coach in it at all —
      // at which point that sentence names somebody who is not there.
      title: 'Your coaching is unaffected',
      body: 'A group is separate from who coaches you, in both directions.',
    },
  ];

  // A coach reading their own group is not a member who can leave it. Editing
  // and closing a group are out of scope, so this seat gets no action at all
  // rather than one that half-works.
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
          members={group.members}
          context={context}
          onLeave={isCoach ? undefined : () => setLeaving(true)}
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
        title={`Leave ${group.name}?`}
        body="You can be invited back, but you will not see what was said while you were gone."
        consequences={consequences}
        confirmTitle="Leave group"
        onConfirm={confirmLeave}
        loading={leave.isPending}
        testID="group-leave-sheet"
      />
    </KeyboardAvoidingView>
  );
}
