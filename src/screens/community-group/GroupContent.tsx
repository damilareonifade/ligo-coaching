import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { useSendGroupMessageMutation } from '@/api/community';
import type { ApiCommunityGroup } from '@/api/types';
import { groupOwnerLine, labelGroupMessages } from '@/lib/community';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatThread from '@/components/chat/ChatThread';
import GroupLeaveAction from '@/components/community/GroupLeaveAction';
import { useAuthStore } from '@/store/authStore';

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
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const send = useSendGroupMessageMutation();

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
          // Every seat, including the coach's. See `GroupLeaveAction`.
          action={<GroupLeaveAction group={group} compact />}
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
    </KeyboardAvoidingView>
  );
}
