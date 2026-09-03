import { memo } from 'react';
import { View } from 'react-native';

import type { ApiChatMessage } from '@/api/types';
import { LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  readonly message: ApiChatMessage;
}

/**
 * Memoised because it is a recycled FlashList row — a re-render of the thread
 * on every keystroke in the composer must not redraw every bubble in it.
 *
 * `from` is read relative to whoever is holding the phone, so this one bubble
 * serves the client's thread and the coach's without knowing which it is in.
 */
function ChatBubble({ message }: ChatBubbleProps) {
  const mine = message.from === 'me';

  return (
    <View className={cn('gap-1', mine ? 'items-end' : 'items-start')}>
      <View
        className={cn('max-w-[80%] rounded-2xl px-4 py-2.5', mine ? 'bg-violet' : 'bg-white')}
      >
        <LIText
          size="p"
          color={mine ? 'inverse' : 'primary'}
          text={message.text}
          className="font-geist"
        />
      </View>
      <LIText size="caption" color="muted" text={message.when} className="px-1 font-geist" />
    </View>
  );
}

export default memo(ChatBubble);
