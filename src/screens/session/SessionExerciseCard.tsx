import { Check } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiSessionExercise, ApiSessionSet } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { formatSetWeight } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

import SessionSetEditor from './SessionSetEditor';

interface ValueChipProps {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly testID?: string;
}

function ValueChip({ label, accessibilityLabel, onPress, testID }: ValueChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="rounded-pill bg-field px-3 py-1 active:opacity-70"
      testID={testID}
    >
      <LIText size="caption" color="body" text={label} className="font-geist-medium" />
    </Pressable>
  );
}

interface SessionExerciseCardProps {
  readonly exercise: ApiSessionExercise;
  /** Resolved sets — draft edits already merged over the server session. */
  readonly sets: readonly ApiSessionSet[];
  readonly onToggleSet: (exerciseId: string, set: ApiSessionSet) => void;
  readonly onEditSet: (exerciseId: string, n: number, weightKg: number, reps: number) => void;
}

function SessionExerciseCard({
  exercise,
  sets,
  onToggleSet,
  onEditSet,
}: SessionExerciseCardProps) {
  const [editing, setEditing] = useState<ApiSessionSet | null>(null);
  const completed = sets.filter((set) => set.completed).length;

  const handleSave = useCallback(
    (weightKg: number, reps: number) => {
      if (editing) onEditSet(exercise.id, editing.n, weightKg, reps);
      setEditing(null);
    },
    [editing, exercise.id, onEditSet],
  );

  return (
    <LICard className="gap-3">
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <LIText size="h5" color="primary" text={exercise.name} className="font-geist-semibold" />
          <LIText size="caption" color="muted" text={exercise.note} className="font-geist" />
        </View>
        <LIText
          size="caption"
          color="muted"
          text={`${completed}/${sets.length}`}
          className="font-geist-medium"
        />
      </View>

      {sets.map((set) => (
        <View key={set.n} className="flex-row items-center gap-2">
          <LIText
            size="caption"
            color="muted"
            text={String(set.n)}
            className="w-4 font-geist-medium"
          />

          <ValueChip
            label={`${formatSetWeight(set.weightKg)} kg`}
            accessibilityLabel={`Set ${set.n} weight, ${formatSetWeight(set.weightKg)} kilograms`}
            onPress={() => setEditing(set)}
            testID={`set-${exercise.id}-${set.n}-weight`}
          />
          <ValueChip
            label={`${set.reps} reps`}
            accessibilityLabel={`Set ${set.n} reps, ${set.reps}`}
            onPress={() => setEditing(set)}
            testID={`set-${exercise.id}-${set.n}-reps`}
          />

          {set.isPr ? <LIBadge tone="violet" label="PR" labelClassName="font-geist-medium" /> : null}

          <View className="flex-1" />

          <Pressable
            onPress={() => onToggleSet(exercise.id, set)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: set.completed }}
            accessibilityLabel={`Set ${set.n} of ${exercise.name}`}
            className={cn(
              'h-9 w-9 items-center justify-center rounded-pill active:opacity-70',
              set.completed ? 'bg-violet' : 'border border-hairline bg-field',
            )}
            testID={`set-${exercise.id}-${set.n}-toggle`}
          >
            {set.completed ? <Check color={tokens.white} size={18} /> : null}
          </Pressable>
        </View>
      ))}

      <SessionSetEditor
        exerciseName={exercise.name}
        set={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </LICard>
  );
}

export default memo(SessionExerciseCard);
