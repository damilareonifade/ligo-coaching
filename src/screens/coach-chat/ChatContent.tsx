import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { useSendMessageMutation } from '@/api/clientChat';
import type { ApiClientChat } from '@/api/types';
import ChatArchivedNotice from '@/components/chat/ChatArchivedNotice';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatHeaderCard from '@/components/chat/ChatHeaderCard';
import ChatThread from '@/components/chat/ChatThread';

interface ChatContentProps {
  readonly chat: ApiClientChat;
}

/**
 * The client's seat on the shared chat. Everything visible here is a shared
 * component; this file is only the wiring — which mutation sends, where the
 * badge leads, and how detaching is worded from this side.
 *
 * `LIForm` gives no keyboard avoidance, so the screen owns it — the composer is
 * the one control that must never end up under the keyboard. The header sits
 * outside the avoiding view's scroll area so it stays put while typing.
 */
export default function ChatContent({ chat }: ChatContentProps) {
  const router = useRouter();
  const { mutateAsync, isPending } = useSendMessageMutation();

  const send = useCallback((text: string) => mutateAsync({ text }), [mutateAsync]);

  const openPermissions = useCallback(
    () => router.push('/onboarding/coach-permissions'),
    [router],
  );

  const attachCoach = useCallback(
    () => router.push('/onboarding/attach-coach?direct=1'),
    [router],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="px-4 pt-2">
        <ChatHeaderCard
          name={chat.coachName}
          context={chat.context}
          badgeLabel={chat.chipLabel}
          onPressBadge={openPermissions}
        />
      </View>

      <View className="flex-1">
        <ChatThread
          messages={chat.messages}
          emptyMessage={`Say hello — ${chat.coachName} will see it the next time he opens Ligo.`}
        />
      </View>

      {chat.archived ? (
        <ChatArchivedNotice
          message={`Closed when you detached. The history stays in your profile — ${chat.coachName} cannot read or send anything here.`}
          actionTitle="Attach a coach"
          onAction={attachCoach}
          actionTestID="chat-attach-coach"
        />
      ) : (
        <ChatComposer onSend={send} isPending={isPending} />
      )}
    </KeyboardAvoidingView>
  );
}
