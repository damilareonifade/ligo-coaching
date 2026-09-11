import { useState } from 'react';
import { View } from 'react-native';

import type { ApiSessionSet } from '@/api/types';
import { LIModal } from '@/components/LIModal';
import { LIButton, LIInput } from '@/components/ui';

interface SetEditorFormProps {
  readonly set: ApiSessionSet;
  readonly onSave: (weightKg: number, reps: number) => void;
}

/**
 * Mounted per set (see the `key` below), so the fields seed themselves from
 * props on first render — no effect syncing state back down.
 */
function SetEditorForm({ set, onSave }: SetEditorFormProps) {
  const [weight, setWeight] = useState(() => String(set.weightKg));
  const [reps, setReps] = useState(() => String(set.reps));

  const handleSave = (): void => {
    // A half-typed field falls back to what the set already held, so Save
    // never wipes a number to zero.
    const parsedWeight = Number.parseFloat(weight.replace(',', '.'));
    const parsedReps = Number.parseInt(reps, 10);

    onSave(
      Number.isFinite(parsedWeight) ? parsedWeight : set.weightKg,
      Number.isFinite(parsedReps) ? parsedReps : set.reps,
    );
  };

  return (
    <>
      <View className="flex-row gap-3">
        <LIInput
          label="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          selectTextOnFocus
          containerClassName="flex-1"
          testID="set-editor-weight"
        />
        <LIInput
          label="Reps"
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
          selectTextOnFocus
          containerClassName="flex-1"
          testID="set-editor-reps"
        />
      </View>

      <LIButton title="Save" onPress={handleSave} fullWidth testID="set-editor-save" />
    </>
  );
}

interface SessionSetEditorProps {
  readonly exerciseName: string;
  /** The set being edited; `null` keeps the sheet closed. */
  readonly set: ApiSessionSet | null;
  readonly onClose: () => void;
  readonly onSave: (weightKg: number, reps: number) => void;
}

/**
 * Weight and reps for one set. A bottom sheet rather than a centre modal:
 * this is a two-field edit made one-handed, mid-set, with the keyboard up.
 * A fixed snap point keeps the sheet from collapsing as its content unmounts
 * on the way out.
 */
export default function SessionSetEditor({
  exerciseName,
  set,
  onClose,
  onSave,
}: SessionSetEditorProps) {
  return (
    <LIModal
      visible={set !== null}
      onClose={onClose}
      title={set ? `${exerciseName} · set ${set.n}` : undefined}
      snapPoints={['40%']}
    >
      {set ? <SetEditorForm key={set.n} set={set} onSave={onSave} /> : null}
    </LIModal>
  );
}
