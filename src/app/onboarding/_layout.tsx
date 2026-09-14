import { Stack } from 'expo-router';

import { useThemeTokens } from '@/theme/tokens';

/**
 * Onboarding runs *after* signup, so the user is already signed in by the time
 * they get here — it therefore lives outside `(auth)` (which is gated on
 * `!signedIn`) and inside the signed-in stack. `(auth)` is a route group, so
 * every `/onboarding/...` path is unchanged by the move.
 */
export default function OnboardingLayout() {
  const tokens = useThemeTokens();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.background } }}
    />
  );
}
