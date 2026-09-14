import { ChevronRight } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiCommunityBoardSummary } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

interface CommunityBoardRowProps {
  readonly board: ApiCommunityBoardSummary;
  /** Opted in leads to the ranking; not opted in leads to the decision. */
  readonly onPress: (board: ApiCommunityBoardSummary) => void;
  readonly first: boolean;
  readonly last: boolean;
}

/**
 * The badge is the whole row's meaning. A board you are on and a board you
 * have merely been invited to look identical otherwise, and they are not the
 * same thing at all — so the badge is present or absent rather than switching
 * between two labels, and the row leads somewhere different in each case.
 */
function CommunityBoardRow({ board, onPress, first, last }: CommunityBoardRowProps) {
  const tokens = useThemeTokens();
  const press = useCallback(() => onPress(board), [onPress, board]);

  return (
    <LICard
      onPress={press}
      className={cn(
        'gap-0 rounded-none px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-border',
      )}
      testID={`community-board-${board.id}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <LIText
              size="p"
              color="primary"
              text={board.name}
              numberOfLines={1}
              className="shrink font-geist-medium"
            />
            {board.optedIn ? (
              <LIBadge
                tone="violet"
                label="Opted in"
                className="px-2 py-0.5"
                labelClassName="font-geist-medium"
              />
            ) : null}
          </View>

          <LIText
            size="caption"
            color="muted"
            text={board.metricLabel}
            numberOfLines={1}
            className="font-geist"
          />
          <LIText
            size="caption"
            color={board.optedIn ? 'accent' : 'muted'}
            text={board.standing}
            numberOfLines={1}
            className="font-geist-medium"
          />
        </View>

        <ChevronRight color={tokens['foreground-subtle']} size={18} />
      </View>
    </LICard>
  );
}

export default memo(CommunityBoardRow);
