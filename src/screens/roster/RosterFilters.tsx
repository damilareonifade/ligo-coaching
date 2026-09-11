import { ScrollView } from 'react-native';

import { LIChip } from '@/components/ui';
import type { RosterAttentionFilter } from '@/lib/roster';

interface RosterFiltersProps {
  readonly selected: RosterAttentionFilter;
  readonly onSelect: (filter: RosterAttentionFilter) => void;
}

const filters: readonly { readonly label: string; readonly value: RosterAttentionFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Needs a look', value: 'review' },
  { label: 'Training now', value: 'live' },
  { label: 'New', value: 'new' },
  { label: 'Quiet', value: 'quiet' },
];

/** Single-select: a roster is read one question at a time. */
export default function RosterFilters({ selected, onSelect }: RosterFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-4"
    >
      {filters.map((filter) => (
        <LIChip
          key={filter.value}
          label={filter.label}
          selected={filter.value === selected}
          onPress={() => onSelect(filter.value)}
          testID={`roster-filter-${filter.value}`}
        />
      ))}
    </ScrollView>
  );
}
