import { memo } from 'react';
import { View } from 'react-native';

import type { ApiBoardRow } from '@/api/types';
import { LIAvatar, LIBadge, LIText } from '@/components/ui';
import { deltaTone } from '@/lib/community';
import { cn } from '@/lib/utils';

interface BoardRankRowProps {
  readonly row: ApiBoardRow;
  readonly first: boolean;
  readonly last: boolean;
}

/** Memoised: a FlashList row, and a long board re-renders on every refresh. */
function BoardRankRow({ row, first, last }: BoardRankRowProps) {
  const tone = deltaTone(row.delta);

  return (
    <View
      className={cn(
        'flex-row items-center gap-3 bg-white px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-hairline',
        // Your own row is tinted, not enlarged or pinned to the top. Where you
        // actually stand is the information; a row that follows you around
        // would replace it with a compliment.
        row.isMe && 'bg-violet-weak/40',
      )}
      testID={`board-row-${row.rank}`}
    >
      <LIText
        size="p"
        color={row.isMe ? 'accent' : 'muted'}
        text={String(row.rank)}
        className="w-5 text-center font-geist-semibold"
      />

      <LIAvatar name={row.displayName} size="sm" labelClassName="font-geist-semibold" />

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <LIText
            size="p"
            color="primary"
            text={row.displayName}
            numberOfLines={1}
            className="shrink font-geist-medium"
          />
          {row.isMe ? (
            <LIBadge
              tone="violet"
              label="You"
              className="px-2 py-0.5"
              labelClassName="font-geist-medium"
            />
          ) : null}
        </View>
        <LIText
          size="caption"
          color="muted"
          text={row.sub}
          numberOfLines={1}
          className="font-geist"
        />
      </View>

      <View className="items-end gap-0.5">
        <LIText
          size="p"
          color="primary"
          text={row.value}
          numberOfLines={1}
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color={tone === 'muted' ? 'muted' : tone}
          text={row.delta}
          className="font-geist-medium"
        />
      </View>
    </View>
  );
}

export default memo(BoardRankRow);
