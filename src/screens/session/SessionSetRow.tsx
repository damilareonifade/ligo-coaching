import { memo } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiSessionSet } from '@/api/types';
import { LICheckbox, LIText } from '@/components/ui';
import { useUnits } from '@/hooks/useUnits';
import type { SetField } from '@/lib/session';
import { cn } from '@/lib/utils';

interface ValueChipProps {
  readonly value: string;
  readonly unit: string;
  readonly active: boolean;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly testID: string;
}

/**
 * Load and reps are separate targets because they are separate edits — see
 * `SetField`. The active chip fills violet so it is obvious which number the
 * bar at the bottom of the screen is pointed at.
 */
function ValueChip({
  value,
  unit,
  active,
  accessibilityLabel,
  onPress,
  testID,
}: ValueChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      className={cn(
        'min-w-24 flex-row items-baseline justify-center gap-1 rounded-lg px-3 py-2 active:opacity-70',
        active ? 'bg-violet' : 'bg-surface-sunken',
      )}
      testID={testID}
    >
      <LIText
        size="p"
        color={active ? 'inverse' : 'primary'}
        text={value}
        className="font-geist-medium"
      />
      <LIText
        size="caption"
        color={active ? 'inverse' : 'muted'}
        text={unit}
        className="font-geist"
      />
    </Pressable>
  );
}

interface SessionSetRowProps {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly set: ApiSessionSet;
  /** Which field of this set the editor is pointed at, if any. */
  readonly activeField: SetField | null;
  readonly onEdit: (set: ApiSessionSet, field: SetField) => void;
  readonly onToggle: (set: ApiSessionSet) => void;
}

function SessionSetRowBase({
  exerciseId,
  exerciseName,
  set,
  activeField,
  onEdit,
  onToggle,
}: SessionSetRowProps) {
  const units = useUnits();
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 px-4 py-2',
        // A done set recedes: the row you are working on should be the bright
        // one, and the ones behind you are a record, not a control.
        set.completed && 'bg-surface-sunken/60',
      )}
      testID={`set-row-${exerciseId}-${set.n}`}
    >
      <LIText
        size="caption"
        color="muted"
        text={String(set.n)}
        className="w-3 font-geist-medium"
      />

      <ValueChip
        value={units.formatSetWeight(set.weightKg)}
        unit={units.weight}
        active={activeField === 'weight'}
        accessibilityLabel={`Set ${set.n} load, ${units.formatWeight(set.weightKg)}`}
        onPress={() => onEdit(set, 'weight')}
        testID={`set-${exerciseId}-${set.n}-weight`}
      />

      <ValueChip
        value={String(set.reps)}
        unit="reps"
        active={activeField === 'reps'}
        accessibilityLabel={`Set ${set.n} reps, ${set.reps}`}
        onPress={() => onEdit(set, 'reps')}
        testID={`set-${exerciseId}-${set.n}-reps`}
      />

      <View className="flex-1" />

      <LICheckbox
        checked={set.completed}
        onChange={() => onToggle(set)}
        accessibilityLabel={`Set ${set.n} of ${exerciseName} done`}
        testID={`set-${exerciseId}-${set.n}-toggle`}
      />
    </View>
  );
}

export default memo(SessionSetRowBase);
