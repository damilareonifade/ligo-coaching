import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';

import type { ApiRosterLabel } from '@/api/types';
import { LIChip, LILabelDot, LIText } from '@/components/ui';

interface RosterLabelFilterProps {
  readonly labels: readonly ApiRosterLabel[];
  /** `null` is "all labels". */
  readonly selected: string | null;
  readonly onSelect: (labelId: string | null) => void;
}

export default function RosterLabelFilter({
  labels,
  selected,
  onSelect,
}: RosterLabelFilterProps) {
  const router = useRouter();
  const manage = useCallback(() => router.push('/roster/labels'), [router]);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <LIText
          size="caption"
          color="muted"
          text="YOUR LABELS"
          className="font-geist-medium uppercase tracking-wide"
        />
        <LIText
          size="caption"
          color="accent"
          text="Manage"
          className="font-geist-medium"
          handleClick={manage}
          testID="roster-manage-labels"
        />
      </View>

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
            label={label.name}
            selected={label.id === selected}
            onPress={() => onSelect(label.id)}
            leading={<LILabelDot color={label.color} />}
            testID={`roster-label-${label.id}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}
