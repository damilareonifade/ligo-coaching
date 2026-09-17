import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';
import { spring, timing, useMotion } from '@/theme/motion';
import { useThemeTokens } from '@/theme/tokens';

import { LIPressable } from './LIPressable';

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
  const tokens = useThemeTokens();
  const { reduced } = useMotion();

  // The tick springs in rather than appearing. It is the smallest mark on the
  // screen and often the only thing that changes when a whole row is tapped,
  // so a cut is easy to miss and easy to doubt.
  const tick = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    const target = checked ? 1 : 0;
    if (reduced) {
      tick.value = target;
      return;
    }
    tick.value = checked ? withSpring(1, spring.settle) : withTiming(0, timing.leaving);
  }, [checked, reduced, tick]);

  const tickStyle = useAnimatedStyle(() => ({
    opacity: tick.value,
    transform: [{ scale: tick.value }],
  }));

  return (
    <LIPressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      hitSlop={8}
      className={cn(
        'h-6 w-6 items-center justify-center rounded-md border',
        checked ? 'border-violet bg-violet' : 'border-border-strong bg-surface',
        disabled && 'opacity-50',
        className,
      )}
      testID={testID}
    >
      <Animated.View style={tickStyle}>
        {checked ? <Check color={tokens.inverse} size={16} strokeWidth={3} /> : <View />}
      </Animated.View>
    </LIPressable>
  );
}
