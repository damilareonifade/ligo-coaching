import { ChevronRight } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiCommunityGroupSummary } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

interface CommunityGroupRowProps {
  readonly group: ApiCommunityGroupSummary;
  readonly onPress: (groupId: string) => void;
  readonly first: boolean;
  readonly last: boolean;
}

/** One group the client is in. Rows form a single card, as elsewhere. */
function CommunityGroupRow({ group, onPress, first, last }: CommunityGroupRowProps) {
  const press = useCallback(() => onPress(group.id), [onPress, group.id]);

  return (
    <LICard
      onPress={press}
      className={cn(
        'gap-0 rounded-none px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-hairline',
      )}
      testID={`community-group-${group.id}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <LIText
            size="p"
            color="primary"
            text={group.name}
            numberOfLines={1}
            className="font-geist-medium"
          />
          <LIText
            size="caption"
            color="muted"
            text={group.preview}
            numberOfLines={1}
            className="font-geist"
          />
          <LIText
            size="caption"
            color="muted"
            text={`${group.memberCount} members · coached by ${group.coachName}`}
            numberOfLines={1}
            className="font-geist"
          />
        </View>

        {group.when.length > 0 ? (
          <LIText size="caption" color="muted" text={group.when} className="font-geist-medium" />
        ) : null}

        <ChevronRight color={tokens.muted} size={18} />
      </View>
    </LICard>
  );
}

export default memo(CommunityGroupRow);
