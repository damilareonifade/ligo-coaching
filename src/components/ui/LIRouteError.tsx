import type { ErrorBoundaryProps } from 'expo-router';
import { View } from 'react-native';

import { LIButton } from './LIButton';
import { LIText } from './LIText';

/**
 * Route-level error boundary body. Re-export as `ErrorBoundary` from a route
 * file and Expo Router will render it when that route throws while rendering.
 */
export function LIRouteError({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
      <LIText size="h3" color="primary" text="This screen hit a snag" className="text-center" />
      <LIText size="p" color="muted" text={error.message} className="text-center" />
      <LIButton title="Reload screen" onPress={() => void retry()} variant="outline" />
    </View>
  );
}
