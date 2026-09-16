import { useCallback, useMemo } from 'react';

import { useAddSessionExerciseMutation } from '@/api/clientTraining';
import { useProgramDetailQuery, useSaveProgramMutation } from '@/api/coachPrograms';
import { errorMessage } from '@/api/client';
import type { SetMeasure } from '@/api/types';
import { newBlock } from '@/lib/programs';
import { newSessionExercise } from '@/lib/session';
import { useProgramDraftStore } from '@/store/programDraftStore';
import { useUiStore } from '@/store/uiStore';

interface AddExerciseTarget {
  readonly programId?: string;
  readonly routineId?: string;
  /**
   * Set instead of the two above when the picker was opened from a workout in
   * progress. A live session is a third destination, not a kind of program.
   */
  readonly sessionId?: string;
}

/**
 * Puts an exercise on whatever the picker was opened for. Three destinations
 * share one path: a saved program writes through the API, the builder's
 * unsaved draft writes to its store, and a workout in progress writes to the
 * session. Both the picker and "Save and add" on the create-exercise screen
 * land here, so a freshly created exercise reaches its target by the same
 * route a listed one does.
 */
export function useAddExerciseToTarget({ programId, routineId, sessionId }: AddExerciseTarget): {
  readonly addExercise: (
    name: string,
    exerciseId?: string | null,
    measure?: SetMeasure,
  ) => void;
  readonly adding: boolean;
} {
  const showToast = useUiStore((state) => state.showToast);
  const programQuery = useProgramDetailQuery(programId ?? '');
  const { mutate: saveProgram, isPending: adding } = useSaveProgramMutation();
  const { mutate: addToSession, isPending: addingToSession } = useAddSessionExerciseMutation();
  const addToDraft = useProgramDraftStore((state) => state.addBlock);

  const program = programQuery.data ?? null;
  const targetRoutine = useMemo(() => {
    if (!program) return null;
    return program.routines.find((day) => day.id === routineId) ?? program.routines[0] ?? null;
  }, [program, routineId]);

  const addExercise = useCallback(
    (name: string, exerciseId: string | null = null, measure?: SetMeasure) => {
      if (sessionId) {
        addToSession(
          { sessionId, exercise: newSessionExercise(name, exerciseId) },
          { onError: (error) => showToast(errorMessage(error), 'danger') },
        );
        return;
      }
      if (!programId) {
        addToDraft(name, exerciseId, measure);
        return;
      }
      if (!program || !targetRoutine) return;

      const routines = program.routines.map((day) =>
        day.id === targetRoutine.id
          ? { ...day, blocks: [...day.blocks, newBlock(name, exerciseId, measure)] }
          : day,
      );
      saveProgram(
        {
          id: program.id,
          name: program.name,
          // Adding one exercise must not blank the note already on it.
          note: program.note,
          kind: 'program',
          weeks: program.weeks,
          sessionsPerWeek: program.sessionsPerWeek,
          routines,
        },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [sessionId, addToSession, programId, program, targetRoutine, saveProgram, showToast, addToDraft],
  );

  return { addExercise, adding: adding || addingToSession };
}
