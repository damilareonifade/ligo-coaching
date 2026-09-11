import { Check } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import type { ApiLiveExercise } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { formatSetWeight } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

interface LiveExerciseCardProps {
  readonly exercise: ApiLiveExercise;
}

/**
 * The client's own set rows, as the coach sees them: same index, weight, reps
 * and tick, and not one of them touchable.
 *
 * The anatomy is copied from `SessionExerciseCard` on purpose — a coach and a
 * client talking on the phone should be looking at the same thing — but every
 * `Pressable` in it is a plain `View` here. That is the difference between
 * watching and editing, and it is enforced by what this file does not import
 * rather than by a `disabled` prop that a later edit could flip.
 *
 * The values are rendered in the same chips as the client's screen so a set
 * still reads as a set, but they are labels, not controls.
 */
function LiveExerciseCard({ exercise }: LiveExerciseCardProps) {
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
        <View key={set.n} className="flex-row items-center gap-2">
          <LIText
            size="caption"
            color="muted"
            text={String(set.n)}
            className="w-4 font-geist-medium"
          />

          <View className="rounded-pill bg-field px-3 py-1">
            <LIText
              size="caption"
              color="body"
              text={`${formatSetWeight(set.weightKg)} kg`}
              className="font-geist-medium"
            />
          </View>
          <View className="rounded-pill bg-field px-3 py-1">
            <LIText
              size="caption"
              color="body"
              text={`${set.reps} reps`}
              className="font-geist-medium"
            />
          </View>

          <View className="flex-1" />

          <View
            accessibilityRole="image"
            accessibilityLabel={
              set.completed
                ? `Set ${set.n} of ${exercise.name}, done`
                : `Set ${set.n} of ${exercise.name}, not done yet`
            }
            className={cn(
              'h-9 w-9 items-center justify-center rounded-pill',
              set.completed ? 'bg-violet' : 'border border-hairline bg-field',
            )}
            testID={`live-set-${exercise.id}-${set.n}`}
          >
            {set.completed ? <Check color={tokens.white} size={18} /> : null}
          </View>
        </View>
      ))}
    </LICard>
  );
}

export default memo(LiveExerciseCard);
