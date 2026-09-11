import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiActivityItem } from '@/api/types';
import { LIAvatar, LICard, LIText } from '@/components/ui';
import { isAccessChange, isAccessLoss } from '@/lib/activity';
import { cn } from '@/lib/utils';

import ActivityAccessGlyph from './ActivityAccessGlyph';

interface ActivityRowProps {
  readonly item: ApiActivityItem;
  readonly onPress: (item: ApiActivityItem) => void;
  /** Rows are one white card per group, so the ends round and the rest divide. */
  readonly first: boolean;
  readonly last: boolean;
}

/** Memoised: FlashList recycles rows, and marking one read re-renders the feed. */
function ActivityRow({ item, onPress, first, last }: ActivityRowProps) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const access = isAccessChange(item.kind);

  return (
    <LICard
      onPress={handlePress}
      className={cn(
        'gap-0 rounded-none px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-hairline',
      )}
      testID={`activity-row-${item.id}`}
    >
      <View className="flex-row items-center gap-3">
        <View>
          <LIAvatar name={item.clientName} size="sm" />
          {access ? <ActivityAccessGlyph kind={item.kind} /> : null}
        </View>

        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            {/* Unread is a dot rather than a violet title: the title's colour is
                already spoken for on access rows, and two meanings on one word
                is one meaning too many. */}
            {item.unread ? (
              <View className="h-2 w-2 rounded-pill bg-violet" testID="activity-unread-dot" />
            ) : null}
            <LIText
              size="p"
              color="primary"
              text={item.title}
              numberOfLines={1}
              className="shrink font-geist-semibold"
            />
          </View>

          {/* The second half of the access treatment. A grant reads violet, a
              revoke or a detach reads danger, everything else stays muted — so
              the tone alone says which way the boundary moved. */}
          <LIText
            size="caption"
            color={access ? (isAccessLoss(item.kind) ? 'danger' : 'accent') : 'muted'}
            text={item.body}
            numberOfLines={2}
            className="font-geist"
          />
        </View>

        <LIText size="caption" color="muted" text={item.when} className="font-geist-medium" />
      </View>
    </LICard>
  );
}

export default memo(ActivityRow);
