import { Stack } from 'expo-router';

import { useThemeTokens } from '@/theme/tokens';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * A stack inside the Train tab, so the active workout keeps the tab bar under
 * it — a lifter mid-session can still check today's macros and come back.
 * Both screens draw their own headers.
 */
export default function TrainLayout() {
  const tokens = useThemeTokens();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="session/[id]" />
    </Stack>
  );
}
