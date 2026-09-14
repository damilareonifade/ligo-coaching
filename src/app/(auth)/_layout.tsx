import { Stack } from 'expo-router';

import { useThemeTokens } from '@/theme/tokens';

export default function AuthLayout() {
  const tokens = useThemeTokens();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.background } }}
    />
  );
}
