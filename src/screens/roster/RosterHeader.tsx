import { View } from 'react-native';

import type { ApiRosterLabel, ApiRosterStat } from '@/api/types';
import type { RosterAttentionFilter, RosterSort } from '@/lib/roster';

import RosterFilters from './RosterFilters';
import RosterLabelFilter from './RosterLabelFilter';
import RosterSearchBar from './RosterSearchBar';
import RosterStats from './RosterStats';

interface RosterHeaderProps {
  readonly stats: readonly ApiRosterStat[];
  readonly labels: readonly ApiRosterLabel[];
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly sort: RosterSort;
  readonly onCycleSort: () => void;
  readonly attention: RosterAttentionFilter;
  readonly onAttentionChange: (filter: RosterAttentionFilter) => void;
  readonly labelId: string | null;
  readonly onLabelChange: (labelId: string | null) => void;
}

/**
 * Everything above the first group, in one piece so it can ride as the list's
 * header and scroll with the roster instead of stealing a third of the screen.
 */
export default function RosterHeader({
  stats,
  labels,
  query,
  onQueryChange,
  sort,
  onCycleSort,
  attention,
  onAttentionChange,
  labelId,
  onLabelChange,
}: RosterHeaderProps) {
  return (
    <View className="gap-3 pb-4 pt-1">
      <RosterStats stats={stats} selected={attention} onSelect={onAttentionChange} />
      <RosterSearchBar
        query={query}
        onQueryChange={onQueryChange}
        sort={sort}
        onCycleSort={onCycleSort}
      />
      <RosterFilters selected={attention} onSelect={onAttentionChange} />
      <RosterLabelFilter labels={labels} selected={labelId} onSelect={onLabelChange} />
    </View>
  );
}
