import { useCallback, useMemo } from 'react';

import { useProgramDetailQuery, useSaveProgramMutation } from '@/api/coachPrograms';
import { errorMessage } from '@/api/client';
import { newBlock } from '@/lib/programs';
import { useProgramDraftStore } from '@/store/programDraftStore';
import { useUiStore } from '@/store/uiStore';

interface AddExerciseTarget {
  readonly programId?: string;
  readonly dayId?: string;
}

/**
 * Puts an exercise on whatever the picker was opened for. Two destinations
 * share one path: a saved program writes through the API, while the builder's
 * unsaved draft writes to its store. Both the picker and "Save and add" on the
 * create-exercise screen land here, so a freshly created exercise reaches the
 * day by the same route a listed one does.
 */
export function useAddExerciseToTarget({ programId, dayId }: AddExerciseTarget): {
  readonly addExercise: (name: string) => void;
  readonly adding: boolean;
} {
  const showToast = useUiStore((state) => state.showToast);
  const programQuery = useProgramDetailQuery(programId ?? '');
  const { mutate: saveProgram, isPending: adding } = useSaveProgramMutation();
  const addToDraft = useProgramDraftStore((state) => state.addBlock);

  const program = programQuery.data ?? null;
  const targetDay = useMemo(() => {
    if (!program) return null;
    return program.days.find((day) => day.id === dayId) ?? program.days[0] ?? null;
  }, [program, dayId]);

  const addExercise = useCallback(
    (name: string) => {
      if (!programId) {
        addToDraft(name);
        return;
      }
      if (!program || !targetDay) return;

      const days = program.days.map((day) =>
        day.id === targetDay.id ? { ...day, blocks: [...day.blocks, newBlock(name)] } : day,
      );
      saveProgram(
        { id: program.id, name: program.name, kind: 'program', weeks: program.weeks, days },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [programId, program, targetDay, saveProgram, showToast, addToDraft],
  );

  return { addExercise, adding };
}
