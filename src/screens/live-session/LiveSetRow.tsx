import { Check } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import type { ApiLiveSet } from '@/api/types';
import { LIButton, LIInput, LIText } from '@/components/ui';
import { useUnits } from '@/hooks/useUnits';
import { parseSetInput } from '@/lib/session';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

interface LiveSetRowProps {
  readonly set: ApiLiveSet;
  readonly exerciseName: string;
  /** False when the client has not allowed this coach to log for them. */
  readonly canEdit: boolean;
  readonly onAdjust: (setId: string, weightKg: number, reps: number) => void;
  readonly saving: boolean;
}

/**
 * One set, watchable and — for a coach the client has given write access to —
 * changeable while they are still on it.
 *
 * Only a set they have not done opens. A set already ticked is history, and
 * the database refuses to move it whoever asks; making it look editable and
 * then failing would be worse than it plainly not being.
 *
 * Editing is inline and opens on a tap, rather than a sheet: this is used
 * one-handed, standing next to somebody, between their sets.
 */
export default function LiveSetRow({
  set,
  exerciseName,
  canEdit,
  onAdjust,
  saving,
}: LiveSetRowProps) {
  const units = useUnits();
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(String(set.weightKg));
  const [reps, setReps] = useState(String(set.reps));

  const parsedWeight = parseSetInput('weight', weight);
  const parsedReps = parseSetInput('reps', reps);
  const valid = parsedWeight !== null && parsedReps !== null;

  const open = useCallback(() => {
    setWeight(String(set.weightKg));
    setReps(String(set.reps));
    setEditing(true);
  }, [set.reps, set.weightKg]);

  const save = useCallback(() => {
    if (parsedWeight === null || parsedReps === null) return;
    onAdjust(set.id, parsedWeight, parsedReps);
    setEditing(false);
  }, [onAdjust, parsedReps, parsedWeight, set.id]);

  if (editing) {
    return (
      <View className="gap-2 rounded-card bg-field p-3" testID={`live-set-edit-${set.id}`}>
        <LIText
          size="caption"
          color="muted"
          text={`Set ${set.n} · ${exerciseName}`}
          className="font-geist-medium"
        />
        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <LIInput
              label={units.weight}
              labelClassName="text-dark-gray"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              autoFocus
              testID={`live-set-weight-${set.id}`}
            />
          </View>
          <View className="flex-1">
            <LIInput
              label="reps"
              labelClassName="text-dark-gray"
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              testID={`live-set-reps-${set.id}`}
            />
          </View>
        </View>
        <View className="flex-row gap-2">
          <LIButton
            title="Cancel"
            onPress={() => setEditing(false)}
            variant="ghost"
            className="flex-1"
            labelClassName="text-dark-gray"
          />
          <LIButton
            title="Save"
            onPress={save}
            disabled={!valid}
            loading={saving}
            className="flex-1"
            testID={`live-set-save-${set.id}`}
          />
        </View>
      </View>
    );
  }

  // A set they have already done, or a coach without write access: a label.
  const openable = canEdit && !set.completed;

  return (
    <View className="flex-row items-center gap-2">
      <LIText size="caption" color="muted" text={String(set.n)} className="w-4 font-geist-medium" />

      <LIButton
        title={`${units.formatSetWeight(set.weightKg)} ${units.weight} · ${set.reps} reps`}
        onPress={open}
        disabled={!openable}
        variant="outline"
        className={cn(
          'flex-1 justify-start border-hairline bg-white',
          // Marked where the coach changed it. The client is entitled to know
          // which numbers on their screen they did not put there.
          set.changedByCoach && 'border-violet-line bg-violet-weak',
        )}
        labelClassName="text-dark-gray"
        testID={`live-set-${set.id}`}
      />

      <View
        accessibilityLabel={
          set.completed
            ? `Set ${set.n} of ${exerciseName}, done`
            : `Set ${set.n} of ${exerciseName}, not done yet`
        }
        className={cn(
          'h-8 w-8 items-center justify-center rounded-pill',
          set.completed ? 'bg-violet' : 'border border-hairline bg-field',
        )}
      >
        {set.completed ? <Check color={tokens.white} size={18} /> : null}
      </View>
    </View>
  );
}
