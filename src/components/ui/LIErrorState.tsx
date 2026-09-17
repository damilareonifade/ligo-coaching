import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useMotion } from '@/theme/motion';

import { LIButton } from './LIButton';
import { LIText } from './LIText';

export interface LIErrorStateProps {
  readonly message?: string;
  readonly onRetry?: () => void;
}

export function LIErrorState({
  message = 'We could not load this. Check your connection and try again.',
  onRetry,
}: LIErrorStateProps) {
  const motion = useMotion();
  return (
    // `flex-1` reaches the wrapper as a style, not a class — NativeWind does
    // not resolve `className` on anything Reanimated wraps, and this one has
    // to fill the screen it was handed.
    <Animated.View entering={motion.enter} style={styles.fill}>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <LIText size="h4" color="primary" text="Something went wrong" className="text-center" />
        <LIText size="p" color="muted" text={message} className="text-center" />
        {onRetry ? (
          <LIButton title="Try again" onPress={onRetry} variant="outline" size="sm" />
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
