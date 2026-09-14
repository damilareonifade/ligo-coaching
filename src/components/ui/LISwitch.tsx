import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useThemeTokens } from '@/theme/tokens';

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const KNOB_SIZE = 22;
const KNOB_INSET = 2;

export interface LISwitchProps {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  /**
   * A switch that is not the reader's to move — the coach's "Permission
   * changed" notification, which is on and stays on.
   *
   * It stays a real switch rather than becoming a decorative view, so a screen
   * reader still announces it as one, with `disabled` alongside `checked`. The
   * press is refused here rather than by handing in a no-op `onValueChange`,
   * which would still animate the knob under the thumb and read as accepted.
   */
  readonly disabled?: boolean;
  /**
   * What this switch is for. The knob carries no text of its own, so without
   * one a screen reader announces "switch, on" and nothing else — and these
   * rows come in fives and sixes. The visible label stays at the call site;
   * this is the same words, said to the reader that cannot see them.
   */
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

/** On/off toggle knob only — the row/label wrapping happens at the call site. */
export function LISwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: LISwitchProps) {
  const tokens = useThemeTokens();
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? tokens.violet : tokens['surface-sunken'], { duration: 150 }),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(value ? TRACK_WIDTH - KNOB_SIZE - KNOB_INSET : KNOB_INSET, {
          duration: 150,
        }),
      },
    ],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      testID={testID}
      hitSlop={8}
    >
      <Animated.View
        style={[
          { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2 },
          trackStyle,
          disabled ? { opacity: 0.5 } : null,
        ]}
      >
        <Animated.View
          style={[
            {
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              borderRadius: KNOB_SIZE / 2,
              marginTop: KNOB_INSET,
              backgroundColor: tokens.inverse,
              shadowColor: tokens.foreground,
              shadowOpacity: 0.15,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
