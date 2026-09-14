import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { useSendCoachMessageMutation } from '@/api/coachMessages';
import type { ApiCoachThread } from '@/api/types';
import ChatArchivedNotice from '@/components/chat/ChatArchivedNotice';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatHeaderCard from '@/components/chat/ChatHeaderCard';
import ChatThread from '@/components/chat/ChatThread';

interface CoachThreadContentProps {
  readonly thread: ApiCoachThread;
}

/**
 * The coach's seat on the same chat the client uses. Everything visible is a
 * shared component; this file is only the wiring — which mutation sends, where
 * the badge leads, and how a detach is worded from this side.
 *
 * `LIForm` gives no keyboard avoidance, so the screen owns it — the composer is
 * the one control that must never end up under the keyboard. The header sits
 * outside the avoiding view's scroll area so it stays put while typing.
 */
export default function CoachThreadContent({ thread }: CoachThreadContentProps) {
  const router = useRouter();
  const { mutateAsync, isPending } = useSendCoachMessageMutation();

  const send = useCallback(
    (text: string) => mutateAsync({ clientId: thread.clientId, text }),
    [mutateAsync, thread.clientId],
  );

  // The badge answers "what did she actually share?", and the client's own
  // screen is where the answer is spelled out — so it opens that, not a dialog.
  const openClient = useCallback(
    () => router.push(`/student/${thread.clientId}`),
    [router, thread.clientId],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="px-4 pt-2">
        <ChatHeaderCard
          name={thread.name}
          badgeLabel={thread.accessLabel}
          onPressBadge={openClient}
          badgeTestID="coach-thread-access-chip"
        />
      </View>

      <View className="flex-1">
        <ChatThread
          messages={thread.messages}
          emptyMessage={`Nothing here yet. Open with a question — ${thread.name} sees it the next time they open Ligo.`}
        />
      </View>

      {/* Not reachable with today's fixtures: every seeded thread is attached.
          It is wired anyway because detaching is the client's call and can land
          at any moment, and the coach must not be left typing into a thread
          that no longer delivers. */}
      {thread.archived ? (
        <ChatArchivedNotice
          message={`Closed when ${thread.name} detached. Their data went with them — the history stays readable, but nothing new can be sent.`}
        />
      ) : (
        <ChatComposer onSend={send} isPending={isPending} />
      )}
    </KeyboardAvoidingView>
  );
}
