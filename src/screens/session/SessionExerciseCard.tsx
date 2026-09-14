import { Plus } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiSessionExercise, ApiSessionSet } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { setProgressLabel, type SetField } from '@/lib/session';
import { tokens } from '@/theme/tokens';

import SessionExerciseNote from './SessionExerciseNote';
import SessionSetRow from './SessionSetRow';

interface SessionExerciseCardProps {
  readonly exercise: ApiSessionExercise;
  /** Resolved sets — draft edits already merged over the server session. */
  readonly sets: readonly ApiSessionSet[];
  /** The set and field the editor is pointed at, when it is in this exercise. */
  readonly activeSetN: number | null;
  readonly activeField: SetField | null;
  readonly onEditSet: (exerciseId: string, set: ApiSessionSet, field: SetField) => void;
  readonly onToggleSet: (exerciseId: string, set: ApiSessionSet) => void;
  readonly onAddSet: (exerciseId: string) => void;
  readonly onSaveNote: (exerciseId: string, note: string | null) => void;
}

function SessionExerciseCardBase({
  exercise,
  sets,
  activeSetN,
  activeField,
  onEditSet,
  onToggleSet,
  onAddSet,
  onSaveNote,
}: SessionExerciseCardProps) {
  return (
    // No padding on the card itself: a completed set tints its whole row, and
    // that tint has to run to both edges to read as a row rather than a patch.
    <LICard className="gap-0 overflow-hidden p-0">
      <View className="flex-row items-start gap-3 px-4 pb-3 pt-4">
        <View className="flex-1 gap-0.5">
          <LIText size="h5" color="primary" text={exercise.name} className="font-geist-semibold" />
          <SessionExerciseNote exercise={exercise} onSaveNote={onSaveNote} />
        </View>
        <LIText
          size="caption"
          color="muted"
          text={setProgressLabel(sets)}
          className="font-geist-medium"
        />
      </View>

      <View className="border-t border-hairline">
        {sets.map((set) => (
          <SessionSetRow
            key={set.n}
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            set={set}
            activeField={activeSetN === set.n ? activeField : null}
            onEdit={(edited, field) => onEditSet(exercise.id, edited, field)}
            onToggle={(toggled) => onToggleSet(exercise.id, toggled)}
          />
        ))}

        {/* A set the plan did not ask for is still a set that happened. */}
        <Pressable
          onPress={() => onAddSet(exercise.id)}
          accessibilityRole="button"
          accessibilityLabel={`Add a set to ${exercise.name}`}
          className="flex-row items-center gap-1.5 border-t border-hairline px-4 py-3 active:opacity-70"
          testID={`add-set-${exercise.id}`}
        >
          <Plus color={tokens.violet} size={16} />
          <LIText size="caption" color="accent" text="Add set" className="font-geist-medium" />
        </Pressable>
      </View>
    </LICard>
  );
}

export default memo(SessionExerciseCardBase);
