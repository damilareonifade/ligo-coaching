import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiInboxEntry } from '@/api/types';
import { LIAvatar, LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface InboxRowProps {
  readonly entry: ApiInboxEntry;
  readonly onPress: (clientId: string) => void;
  /** Rows are one white card, so the ends round and the rest divide. */
  readonly first: boolean;
  readonly last: boolean;
}

/** Memoised: FlashList recycles rows, and the list re-renders on every keystroke. */
function InboxRow({ entry, onPress, first, last }: InboxRowProps) {
  const handlePress = useCallback(() => onPress(entry.clientId), [onPress, entry.clientId]);

  return (
    <LICard
      onPress={handlePress}
      className={cn(
        'gap-0 rounded-none px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-border',
      )}
      testID={`inbox-row-${entry.clientId}`}
    >
      <View className="flex-row items-center gap-3">
        <LIAvatar name={entry.name} size="sm" />

        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <LIText
              size="p"
              color="primary"
              text={entry.name}
              numberOfLines={1}
              className={cn('shrink', entry.unread ? 'font-geist-semibold' : 'font-geist-medium')}
            />
            {entry.unread ? (
              <View className="h-2 w-2 rounded-pill bg-violet" testID="inbox-unread-dot" />
            ) : null}
          </View>

          {/* Unread lifts the preview out of muted rather than colouring it —
              an unanswered client should read as present, not as an alert. */}
          <LIText
            size="caption"
            color={entry.unread ? 'body' : 'muted'}
            text={entry.preview}
            numberOfLines={1}
            className={cn(entry.unread ? 'font-geist-medium' : 'font-geist')}
          />

          {/* What this client shares, said on the row that does not depend on
              it. Messaging is open either way, so this is context, never a
              gate — hence the quietest type on the row. */}
          <LIText
            size="caption"
            color="muted"
            text={entry.accessLabel}
            numberOfLines={1}
            className="font-geist"
          />
        </View>

        <LIText size="caption" color="muted" text={entry.when} className="font-geist-medium" />
      </View>
    </LICard>
  );
}

export default memo(InboxRow);
