import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

export interface LICheckboxProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  /**
   * Spoken name. The box is drawn without one, so the label beside it at the
   * call site has to be repeated here or a screen reader reaches an unnamed
   * control — which matters most on the one checkbox in the app that carries
   * a consent sentence.
   */
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly testID?: string;
}

/**
 * Box only — the row and its label are the caller's, exactly as with
 * `LISwitch`. A switch is for a setting that takes effect as it moves; this is
 * for a choice that is read and then confirmed, which is why the two are
 * different controls rather than one with a variant.
 */
export function LICheckbox({
  checked,
  onChange,
  accessibilityLabel,
  disabled = false,
  className,
  testID,
}: LICheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      hitSlop={8}
      className={cn(
        'h-6 w-6 items-center justify-center rounded-md border',
        checked ? 'border-violet bg-violet' : 'border-hairline-strong bg-white',
        disabled && 'opacity-50',
        className,
      )}
      testID={testID}
    >
      {checked ? <Check color={tokens.white} size={16} strokeWidth={3} /> : <View />}
    </Pressable>
  );
}
