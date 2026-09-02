import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';

export interface LISkeletonProps {
  readonly className?: string;
}

/**
 * Shimmer runs on the UI thread, so it keeps animating while JS is busy
 * parsing the response it is standing in for.
 */
export function LISkeleton({ className }: LISkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={style}
      className={cn('rounded-lg bg-gray', className)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
