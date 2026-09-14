import { Minus, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { LIButton, LIInput, LIText } from '@/components/ui';
import { useUnits } from '@/hooks/useUnits';
import { parseSetInput, stepSetValue, type SetField } from '@/lib/session';
import { tokens } from '@/theme/tokens';

export interface SetEditTarget {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly setN: number;
  readonly field: SetField;
  readonly value: number;
}

interface StepButtonProps {
  readonly direction: 1 | -1;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
  readonly testID: string;
}

function StepButton({ direction, onPress, accessibilityLabel, testID }: StepButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-14 w-14 items-center justify-center rounded-xl border border-hairline-strong active:opacity-70"
      testID={testID}
    >
      {direction === 1 ? (
        <Plus color={tokens.violet} size={20} />
      ) : (
        <Minus color={tokens.violet} size={20} />
      )}
    </Pressable>
  );
}

interface SessionSetBarProps {
  /** `null` keeps the bar off screen entirely. */
  readonly target: SetEditTarget | null;
  readonly onChange: (next: number) => void;
  readonly onDone: () => void;
}

interface SetBarBodyProps {
  readonly target: SetEditTarget;
  readonly onChange: (next: number) => void;
  readonly onDone: () => void;
}

/**
 * Mounted per set-and-field (see the `key` below), so half-typed text is
 * abandoned when the bar is pointed somewhere else without an effect having to
 * reach in and clear it.
 */
function SetBarBody({ target, onChange, onDone }: SetBarBodyProps) {
  const units = useUnits();
  /**
   * What is in the box while it is being typed in. `null` means nobody is
   * typing, so the box shows the draft's own value — which is what makes the
   * steppers and the keyboard the same control rather than two that fight.
   */
  const [typed, setTyped] = useState<string | null>(null);

  const step = useCallback(
    (direction: 1 | -1) => {
      setTyped(null);
      onChange(stepSetValue(target.field, target.value, direction, units.weight));
    },
    [target, onChange, units.weight],
  );

  const handleType = useCallback(
    (text: string) => {
      setTyped(text);

      const parsed = parseSetInput(target.field, text, units.weight);
      // Nothing usable yet — an empty box on the way to a new number must not
      // land as a zero.
      if (parsed !== null) onChange(parsed);
    },
    [target, onChange, units.weight],
  );

  const finish = useCallback(() => {
    setTyped(null);
    onDone();
  }, [onDone]);

  const isReps = target.field === 'reps';
  const unit = isReps ? 'reps' : units.weight;
  const stepLabel = isReps ? '1 rep' : `${units.weightStep} ${units.weight}`;
  // `target.value` is kilograms, as everything stored is. Shown in whatever
  // this reader has chosen; `handleType` converts back on the way in.
  const shown = typed ?? (isReps ? String(target.value) : units.formatSetWeight(target.value));

  return (
    <View
      className="gap-3 border-t border-hairline bg-white px-4 pb-6 pt-3"
      testID="session-set-bar"
    >
      <View className="flex-row items-center justify-between">
        <LIText
          size="p"
          color="primary"
          text={`${target.exerciseName} · set ${target.setN}`}
          numberOfLines={1}
          className="flex-1 font-geist-medium"
        />
        {/* Says where the edit lands: the coach prescribed a number, this is
            the client's own log of what they actually did. */}
        <LIText size="caption" color="muted" text="Saved as yours" className="font-geist-medium" />
      </View>

      <View className="flex-row items-center gap-3">
        <StepButton
          direction={-1}
          onPress={() => step(-1)}
          accessibilityLabel={`Decrease by ${stepLabel}`}
          testID="set-bar-decrease"
        />

        <LIInput
          value={shown}
          onChangeText={handleType}
          onSubmitEditing={finish}
          keyboardType={isReps ? 'number-pad' : 'decimal-pad'}
          returnKeyType="done"
          selectTextOnFocus
          variant="filled"
          inputSize="lg"
          accessibilityLabel={`${isReps ? 'Reps' : 'Load'} for set ${target.setN}`}
          containerClassName="flex-1"
          fieldClassName="justify-center gap-1.5"
          inputClassName="w-24 flex-none text-center text-h3 font-geist-semibold text-ink"
          trailing={<LIText size="p" color="muted" text={unit} className="font-geist" />}
          testID="set-bar-value"
        />

        <StepButton
          direction={1}
          onPress={() => step(1)}
          accessibilityLabel={`Increase by ${stepLabel}`}
          testID="set-bar-increase"
        />
      </View>

      <View className="flex-row items-center gap-3">
        <LIText
          size="caption"
          color="muted"
          text={`${isReps ? 'Reps' : 'Load'} only. Load and reps are logged separately so PRs stay comparable.`}
          className="flex-1 font-geist"
        />
        <LIButton title="Done" onPress={finish} shape="rounded" testID="set-bar-done" />
      </View>
    </View>
  );
}

/**
 * The set editor, docked to the bottom of the screen rather than presented as
 * a sheet.
 *
 * Three reasons it is not a modal: the sets above it stay visible, so the
 * number being changed can be read against the ones around it; it is one tap
 * to reach and one to leave, mid-set, one-handed; and a panel that is simply
 * part of the screen cannot fail to appear.
 *
 * Steppers *and* a keyboard: adding a plate or a rep is a tap, but going from
 * 60 to 100 is a number you already know, and sixteen taps to get there is
 * absurd.
 */
export default function SessionSetBar({ target, onChange, onDone }: SessionSetBarProps) {
  if (!target) return null;

  return (
    <SetBarBody
      key={`${target.exerciseId}-${target.setN}-${target.field}`}
      target={target}
      onChange={onChange}
      onDone={onDone}
    />
  );
}
