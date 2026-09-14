import { View } from 'react-native';

import type { ApiRosterClient, ApiRosterLabel } from '@/api/types';
import type { RosterAttentionFilter, RosterSort } from '@/lib/roster';

import RosterFilters from './RosterFilters';
import RosterLabelFilter from './RosterLabelFilter';
import RosterSearchBar from './RosterSearchBar';

interface RosterHeaderProps {
  readonly clients: readonly ApiRosterClient[];
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
 *
 * Two rows now, or three for a coach who files people. It was four, and two of
 * them — a row of KPI tiles and a row of filter chips — set the same state
 * from the same five values. The counts moved onto the chips.
 */
export default function RosterHeader({
  clients,
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
      <RosterSearchBar
        query={query}
        onQueryChange={onQueryChange}
        sort={sort}
        onCycleSort={onCycleSort}
      />
      <RosterFilters clients={clients} selected={attention} onSelect={onAttentionChange} />
      <RosterLabelFilter labels={labels} selected={labelId} onSelect={onLabelChange} />
    </View>
  );
}
