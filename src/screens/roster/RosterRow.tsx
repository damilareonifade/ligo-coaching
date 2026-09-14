import { ChevronRight } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiRosterClient, ApiRosterLabel, RosterAttention } from '@/api/types';
import { LIAvatar, LIBadge, LICard, LILabelDot, LIText } from '@/components/ui';
import { accessLabel } from '@/lib/roster';
import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

interface RosterRowProps {
  readonly client: ApiRosterClient;
  /** Resolved by the group — `null` when the client is unfiled. */
  readonly label: ApiRosterLabel | null;
  readonly onPress: (clientId: string) => void;
  /** Rows are one white card per group, so the ends round and the rest divide. */
  readonly first: boolean;
  readonly last: boolean;
}

/**
 * `ok` and `quiet` earn no chip. A roster where every row shouts is a roster
 * where nothing does — the chip is for the three states worth crossing a room
 * for.
 */
const attentionChip: Partial<
  Record<RosterAttention, { readonly label: string; readonly className?: string }>
> = {
  live: { label: 'Live', className: 'bg-violet' },
  review: { label: 'Needs a look' },
  new: { label: 'New' },
};

function chipTone(attention: RosterAttention): 'violet' | 'warning' {
  return attention === 'review' ? 'warning' : 'violet';
}

/** Memoised: FlashList recycles rows, and a long roster re-renders on every tick. */
function RosterRow({ client, label, onPress, first, last }: RosterRowProps) {
  const tokens = useThemeTokens();
  const handlePress = useCallback(() => onPress(client.id), [onPress, client.id]);
  const chip = attentionChip[client.attention];

  return (
    <LICard
      onPress={handlePress}
      className={cn(
        'gap-0 rounded-none px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-border',
      )}
      testID={`roster-row-${client.id}`}
    >
      <View className="flex-row items-center gap-3">
        <LIAvatar name={client.name} size="sm" />

        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <LIText
              size="p"
              color="primary"
              text={client.name}
              numberOfLines={1}
              className="shrink font-geist-medium"
            />
            {chip ? (
              <LIBadge
                tone={chipTone(client.attention)}
                label={chip.label}
                className={cn('px-2 py-0.5', chip.className)}
                labelClassName={cn(
                  'font-geist-medium',
                  client.attention === 'live' && 'text-surface',
                )}
              />
            ) : null}
          </View>

          <View className="flex-row items-center gap-1.5">
            {label ? (
              <>
                <LILabelDot color={label.color} />
                <LIText
                  size="caption"
                  color="muted"
                  text={label.name}
                  numberOfLines={1}
                  className="font-geist-medium"
                />
                <LIText size="caption" color="muted" text="·" className="font-geist" />
              </>
            ) : null}
            <LIText
              size="caption"
              color="muted"
              text={client.meta}
              numberOfLines={1}
              className="flex-1 font-geist"
            />
          </View>
        </View>

        {/* What this client shares, on every row. Never louder than the name —
            it is a boundary to respect, not a status to chase. */}
        <View className="items-end gap-0.5">
          <LIText
            size="caption"
            color="muted"
            text={client.when}
            className="font-geist-medium"
          />
          <LIText
            size="caption"
            color="muted"
            text={accessLabel[client.access]}
            numberOfLines={1}
            className="font-geist"
          />
        </View>

        <ChevronRight color={tokens['foreground-subtle']} size={18} />
      </View>
    </LICard>
  );
}

export default memo(RosterRow);
