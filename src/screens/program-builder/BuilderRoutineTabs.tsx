import { ScrollView } from 'react-native';

import { LIChip } from '@/components/ui';
import { useProgramDraftStore } from '@/store/programDraftStore';

/** Which routine the exercise list below is editing. Horizontal — six will not fit. */
export default function BuilderRoutineTabs() {
  const routines = useProgramDraftStore((state) => state.routines);
  const selectedRoutineId = useProgramDraftStore((state) => state.selectedRoutineId);
  const selectRoutine = useProgramDraftStore((state) => state.selectRoutine);

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
          onPress={() => selectRoutine(routine.id)}
          testID={`builder-routine-${routine.id}`}
        />
      ))}
    </ScrollView>
  );
}
