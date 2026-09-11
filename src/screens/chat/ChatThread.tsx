import { useCallback } from 'react';
import { View } from 'react-native';

import { LIEmptyState, LIList } from '@/components/ui';

import ChatBubble, { type ChatBubbleMessage } from './ChatBubble';

interface ChatThreadProps {
  /**
   * `ChatBubbleMessage` widens `ApiChatMessage` by two optional fields, so the
   * two 1:1 callers hand over their messages unchanged and the group hands
   * over the same messages with a sender label attached.
   */
  readonly messages: readonly ChatBubbleMessage[];
  /** Worded by the caller — the two seats say different things to an empty thread. */
  readonly emptyMessage: string;
  readonly testID?: string;
}

/**
 * A thread has no ceiling, so it is a FlashList rather than a mapped ScrollView.
 * Ordering is plain chronological — oldest at the top, newest at the bottom —
 * which is what the composer sitting underneath it implies.
 *
 * Chronological order means the list must open at the *end*: without
 * `startRenderingFromBottom` a long thread lands on its oldest message, and a
 * message you just sent appends below the fold. `autoscrollToBottomThreshold`
 * then follows new arrivals only when you are already near the bottom, so it
 * cannot yank the view while you are reading back through history.
 *
 * Shared by three callers now: the client's thread with their coach, the
 * coach's thread with one client, and a group of seven. That behaviour is
 * fixed in one place and cannot drift apart between them.
 */
export default function ChatThread({ messages, emptyMessage, testID }: ChatThreadProps) {
  const renderItem = useCallback(
    ({ item }: { item: ChatBubbleMessage }) => <ChatBubble message={item} />,
    [],
  );

  return (
    <LIList
      data={[...messages]}
      keyExtractor={(message) => message.id}
      renderItem={renderItem}
      contentContainerClassName="px-4 pb-4 pt-3"
      ItemSeparatorComponent={() => <View className="h-3" />}
      maintainVisibleContentPosition={{
        startRenderingFromBottom: true,
        autoscrollToBottomThreshold: 0.2,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      ListEmptyComponent={<LIEmptyState title="No messages yet" message={emptyMessage} />}
      testID={testID ?? 'chat-thread'}
    />
  );
}
