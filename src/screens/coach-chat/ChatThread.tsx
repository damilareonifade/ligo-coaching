import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiChatMessage } from '@/api/types';
import { LIEmptyState, LIList } from '@/components/ui';

import ChatBubble from './ChatBubble';

interface ChatThreadProps {
  readonly messages: readonly ApiChatMessage[];
  readonly coachName: string;
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
 */
export default function ChatThread({ messages, coachName }: ChatThreadProps) {
  const renderItem = useCallback(
    ({ item }: { item: ApiChatMessage }) => <ChatBubble message={item} />,
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
      ListEmptyComponent={
        <LIEmptyState
          title="No messages yet"
          message={`Say hello — ${coachName} will see it the next time he opens Ligo.`}
        />
      }
      testID="chat-thread"
    />
  );
}
