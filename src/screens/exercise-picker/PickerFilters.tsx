import { LIChipGroup, type LIChipOption } from '@/components/ui';
import type { ExerciseFilter } from '@/lib/programs';

interface PickerFiltersProps {
  readonly value: ExerciseFilter;
  readonly onChange: (value: ExerciseFilter) => void;
}

/** "Recent" is a section rather than a tag, and sits last for that reason. */
const options: readonly LIChipOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Compound', value: 'compound' },
  { label: 'Accessory', value: 'accessory' },
  { label: 'Yours', value: 'yours' },
  { label: 'Recent', value: 'recent' },
];

export default function PickerFilters({ value, onChange }: PickerFiltersProps) {
  return (
    <LIChipGroup
      options={options}
      value={value}
      onChange={(next) => onChange(next as ExerciseFilter)}
      testID="picker-filter"
    />
  );
}
