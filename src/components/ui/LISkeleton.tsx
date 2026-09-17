import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';

export interface LISkeletonProps {
  readonly className?: string;
  readonly testID?: string;
}

/**
 * Shimmer runs on the UI thread, so it keeps animating while JS is busy
 * parsing the response it is standing in for.
 *
 * The shape is a plain `View` inside an animated wrapper, and it has to stay
 * that way. NativeWind resolves `className` only for components held by
 * reference in its own registry, and `Animated.View` — which Reanimated
 * builds by wrapping `View` — is not one of them. A skeleton takes its whole
 * size from the class its caller passes (`<LISkeleton className="h-5 w-48" />`),
 * so a class on the animated element would leave it zero by zero, unfilled,
 * and completely silent about it.
 */
export function LISkeleton({ className, testID = 'li-skeleton' }: LISkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <View className={cn('rounded-lg bg-surface-sunken', className)} />
    </Animated.View>
  );
}
