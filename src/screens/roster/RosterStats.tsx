import { View } from 'react-native';

import type { ApiRosterStat } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import type { RosterAttentionFilter } from '@/lib/roster';
import { cn } from '@/lib/utils';

/**
 * A KPI is only worth a tile if tapping it takes you to the people behind the
 * number — so each one is the filter it stands for. "Clients" is the way back.
 */
const statFilter: Record<string, RosterAttentionFilter> = {
  clients: 'all',
  review: 'review',
  live: 'live',
};

interface RosterStatsProps {
  readonly stats: readonly ApiRosterStat[];
  readonly selected: RosterAttentionFilter;
  readonly onSelect: (filter: RosterAttentionFilter) => void;
}

export default function RosterStats({ stats, selected, onSelect }: RosterStatsProps) {
  return (
    <View className="flex-row gap-3">
      {stats.map((stat) => {
        const filter = statFilter[stat.id] ?? 'all';
        const active = filter === selected;

        return (
          <LICard
            key={stat.id}
            onPress={() => onSelect(filter)}
            className={cn(
              'flex-1 gap-1 border border-transparent px-3 py-3',
              active && 'border-violet bg-violet-weak',
            )}
            testID={`roster-stat-${stat.id}`}
          >
            <LIText size="h3" color="primary" text={stat.value} className="font-geist-semibold" />
            <LIText
              size="caption"
              color="muted"
              text={stat.label}
              numberOfLines={1}
              className="font-geist-medium uppercase tracking-wide"
            />
          </LICard>
        );
      })}
    </View>
  );
}
