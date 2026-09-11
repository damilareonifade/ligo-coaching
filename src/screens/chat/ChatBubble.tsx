import { memo } from 'react';
import { View } from 'react-native';

import type { ApiChatMessage } from '@/api/types';
import { LIBadge, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * A 1:1 message, plus the two things a group message needs and a 1:1 one
 * cannot have. Both are optional, so the client's thread and the coach's pass
 * a plain `ApiChatMessage` and are unchanged by their existence.
 *
 * `senderName` is undefined rather than absent for a message grouped under the
 * one above it — see `labelGroupMessages` in src/lib/community.ts, which
 * decides which message in a run gets named.
 */
export interface ChatBubbleMessage extends ApiChatMessage {
  /** Group threads only: who sent it, as the group knows them. */
  readonly senderName?: string;
  readonly isCoach?: boolean;
}

interface ChatBubbleProps {
  readonly message: ChatBubbleMessage;
}

/**
 * Memoised because it is a recycled FlashList row — a re-render of the thread
 * on every keystroke in the composer must not redraw every bubble in it.
 *
 * `from` is read relative to whoever is holding the phone, so this one bubble
 * serves the client's thread, the coach's, and a group of seven without
 * knowing which it is in.
 *
 * The name above the bubble is only ever a *display* name. In a group that is
 * the whole point: the person who chose a handle is a handle here, to everyone
 * including the coach, and there is nowhere in this component a real name
 * could arrive from.
 */
function ChatBubble({ message }: ChatBubbleProps) {
  const mine = message.from === 'me';

  return (
    <View className={cn('gap-1', mine ? 'items-end' : 'items-start')}>
      {message.senderName ? (
        <View className="flex-row items-center gap-1.5 px-1">
          <LIText
            size="caption"
            color="muted"
            text={message.senderName}
            className="font-geist-medium"
          />
          {message.isCoach ? (
            <LIBadge
              tone="violet"
              label="Coach"
              className="px-2 py-0"
              labelClassName="font-geist-medium"
            />
          ) : null}
        </View>
      ) : null}

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
