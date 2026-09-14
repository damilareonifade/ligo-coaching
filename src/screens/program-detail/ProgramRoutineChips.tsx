import { ScrollView } from 'react-native';

import type { ApiProgramRoutine } from '@/api/types';
import { LIChip } from '@/components/ui';

interface ProgramRoutineChipsProps {
  readonly routines: readonly ApiProgramRoutine[];
  readonly selectedRoutineId: string;
  readonly onSelect: (routineId: string) => void;
}

/**
 * Single-select, though `LIChip` is a multi-select pill: a program shows one
 * day at a time, so the row is a day switch and the chips behave like one.
 */
export default function ProgramRoutineChips({
  routines,
  selectedRoutineId,
  onSelect,
}: ProgramRoutineChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      {routines.map((routine) => (
        <LIChip
          key={routine.id}
          label={routine.name}
          selected={routine.id === selectedRoutineId}
          onPress={() => onSelect(routine.id)}
          testID={`program-routine-${routine.id}`}
        />
      ))}
    </ScrollView>
  );
}
