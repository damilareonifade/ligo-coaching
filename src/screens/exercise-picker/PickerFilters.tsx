import { useMemo } from 'react';
import { View } from 'react-native';

import type { ApiExerciseFilterOption } from '@/api/types';
import { LIChipGroup, type LIChipOption } from '@/components/ui';
import type { ExerciseFilter } from '@/lib/programs';

interface PickerFiltersProps {
  readonly options: readonly ApiExerciseFilterOption[];
  readonly value: ExerciseFilter;
  readonly onChange: (value: ExerciseFilter) => void;
}

const ANY = '';

function chipsFor(
  options: readonly ApiExerciseFilterOption[],
  kind: ApiExerciseFilterOption['kind'],
): readonly LIChipOption[] {
  return [
    { label: 'All', value: ANY },
    ...options
      .filter((option) => option.kind === kind)
      // The count is on the chip because "Cable (48)" and "Cable (2)" are
      // different offers, and one of them is worth tapping.
      .map((option) => ({ label: `${option.label} (${option.count})`, value: option.value })),
  ];
}

/**
 * Muscle and equipment, and nothing else.
 *
 * It used to be one row mixing unlike things — Compound and Accessory describe
 * a movement, Yours and Recent describe who made it — so choosing one meant
 * giving up the others, and "dumbbell chest exercises", which is how people
 * actually think, could not be asked at all.
 *
 * Both rows scroll on one line. The catalogue has ten muscle groups and nearly
 * thirty pieces of equipment; wrapped, that is eight lines of chrome above a
 * list somebody is trying to read.
 */
export default function PickerFilters({ options, value, onChange }: PickerFiltersProps) {
  const muscles = useMemo(() => chipsFor(options, 'body_part'), [options]);
  const equipment = useMemo(() => chipsFor(options, 'equipment'), [options]);

  return (
    <View className="gap-3">
      <LIChipGroup
        label="Muscle"
        options={muscles}
        value={value.bodyPart ?? ANY}
        onChange={(next) => onChange({ ...value, bodyPart: next === ANY ? null : next })}
        scrollable
        testID="picker-filter-muscle"
      />
      <LIChipGroup
        label="Equipment"
        options={equipment}
        value={value.equipment ?? ANY}
        onChange={(next) => onChange({ ...value, equipment: next === ANY ? null : next })}
        scrollable
        testID="picker-filter-equipment"
      />
    </View>
  );
}
