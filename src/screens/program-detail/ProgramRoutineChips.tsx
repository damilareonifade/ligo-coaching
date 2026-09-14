import { ScrollView } from 'react-native';

import type { ApiProgramDay } from '@/api/types';
import { LIChip } from '@/components/ui';

interface ProgramDayChipsProps {
  readonly days: readonly ApiProgramDay[];
  readonly selectedDayId: string;
  readonly onSelect: (dayId: string) => void;
}

/**
 * Single-select, though `LIChip` is a multi-select pill: a program shows one
 * day at a time, so the row is a day switch and the chips behave like one.
 */
export default function ProgramDayChips({
  days,
  selectedDayId,
  onSelect,
}: ProgramDayChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      {days.map((day) => (
        <LIChip
          key={day.id}
          label={day.label}
          selected={day.id === selectedDayId}
          onPress={() => onSelect(day.id)}
          testID={`program-day-${day.id}`}
        />
      ))}
    </ScrollView>
  );
}
