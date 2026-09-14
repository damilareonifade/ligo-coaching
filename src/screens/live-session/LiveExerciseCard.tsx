import { memo } from 'react';
import { View } from 'react-native';

import type { ApiLiveExercise } from '@/api/types';
import { LICard, LIText } from '@/components/ui';

import LiveSetRow from './LiveSetRow';

interface LiveExerciseCardProps {
  readonly exercise: ApiLiveExercise;
  /** The client's `log_for` switch — see `ApiLiveSession.canEdit`. */
  readonly canEdit: boolean;
  readonly onAdjust: (setId: string, weightKg: number, reps: number) => void;
  readonly savingSetId: string | null;
}

/**
 * The client's own set rows, as the coach sees them: same index, weight, reps
 * and tick, in the same anatomy as `SessionExerciseCard` — a coach and a
 * client talking on the phone should be looking at the same thing.
 *
 * What is touchable is decided per row rather than per screen: a set still to
 * come opens for a coach the client gave write access to, and one already done
 * never opens for anybody. See `LiveSetRow`.
 */
function LiveExerciseCard({
  exercise,
  canEdit,
  onAdjust,
  savingSetId,
}: LiveExerciseCardProps) {
  return (
    <LICard className="gap-3" testID={`live-exercise-${exercise.id}`}>
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <LIText size="h5" color="primary" text={exercise.name} className="font-geist-semibold" />
          <LIText size="caption" color="muted" text={exercise.note} className="font-geist" />
        </View>
        <LIText
          size="caption"
          color="muted"
          text={exercise.progress}
          className="font-geist-medium"
        />
      </View>

      {exercise.sets.map((set) => (
        <LiveSetRow
          key={set.id}
          set={set}
          exerciseName={exercise.name}
          canEdit={canEdit}
          onAdjust={onAdjust}
          saving={savingSetId === set.id}
        />
      ))}
    </LICard>
  );
}

export default memo(LiveExerciseCard);
