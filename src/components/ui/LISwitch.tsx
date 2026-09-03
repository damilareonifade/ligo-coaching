import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { tokens } from '@/theme/tokens';

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const KNOB_SIZE = 22;
const KNOB_INSET = 2;

export interface LISwitchProps {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly testID?: string;
}

/** On/off toggle knob only — the row/label wrapping happens at the call site. */
export function LISwitch({ value, onValueChange, testID }: LISwitchProps) {
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? tokens.violet : tokens.field, { duration: 150 }),
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
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      testID={testID}
      hitSlop={8}
    >
      <Animated.View
        style={[
          { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2 },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              borderRadius: KNOB_SIZE / 2,
              marginTop: KNOB_INSET,
              backgroundColor: tokens.white,
              shadowColor: tokens.ink,
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
