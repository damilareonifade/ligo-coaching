import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView } from 'react-native';

import type { ApiRosterLabel } from '@/api/types';
import { LIChip, LILabelDot } from '@/components/ui';

interface RosterLabelFilterProps {
  readonly labels: readonly ApiRosterLabel[];
  /** `null` is "all labels". */
  readonly selected: string | null;
  readonly onSelect: (labelId: string | null) => void;
}

/**
 * Filing is optional, so this row is too: a coach who has never made a label
 * gets no row and no "YOUR LABELS" header over an empty one.
 *
 * "Manage" rides at the end of the same scroll instead of as a heading above
 * it — it is the least-used control here and was taking a full line of its own.
 */
export default function RosterLabelFilter({
  labels,
  selected,
  onSelect,
}: RosterLabelFilterProps) {
  const router = useRouter();
  const manage = useCallback(() => router.push('/roster/labels'), [router]);

  if (labels.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-4"
    >
      <LIChip
        label="All labels"
        selected={selected === null}
        onPress={() => onSelect(null)}
        testID="roster-label-all"
      />
      {labels.map((label) => (
        <LIChip
          key={label.id}
          label={`${label.name} ${label.count}`}
          selected={label.id === selected}
          onPress={() => onSelect(label.id)}
          leading={<LILabelDot color={label.color} />}
          testID={`roster-label-${label.id}`}
        />
      ))}
      <LIChip
        label="Manage"
        selected={false}
        onPress={manage}
        testID="roster-manage-labels"
      />
    </ScrollView>
  );
}
