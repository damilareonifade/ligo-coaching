import { ScrollView } from 'react-native';

import type { ApiRosterClient } from '@/api/types';
import { LIChip } from '@/components/ui';
import { attentionCounts, type RosterAttentionFilter } from '@/lib/roster';

interface RosterFiltersProps {
  readonly clients: readonly ApiRosterClient[];
  readonly selected: RosterAttentionFilter;
  readonly onSelect: (filter: RosterAttentionFilter) => void;
}

const FILTERS: readonly { readonly label: string; readonly value: RosterAttentionFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Needs a look', value: 'review' },
  { label: 'Training now', value: 'live' },
  { label: 'New', value: 'new' },
  { label: 'Quiet', value: 'quiet' },
];

/**
 * One row, single-select: a roster is read one question at a time.
 *
 * Each chip carries its own count, which is what the KPI tiles above this used
 * to do from a separate row while setting the very same state. A filter that
 * would return nobody is dropped rather than shown at zero — a coach with
 * everyone training does not need to be offered "Quiet 0".
 *
 * "All" always stays: it is the way back.
 */
export default function RosterFilters({ clients, selected, onSelect }: RosterFiltersProps) {
  const counts = attentionCounts(clients);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-4"
    >
      {FILTERS.filter(
        (filter) => filter.value === 'all' || counts[filter.value] > 0,
      ).map((filter) => (
        <LIChip
          key={filter.value}
          label={`${filter.label} ${counts[filter.value]}`}
          selected={filter.value === selected}
          onPress={() => onSelect(filter.value)}
          testID={`roster-filter-${filter.value}`}
        />
      ))}
    </ScrollView>
  );
}
