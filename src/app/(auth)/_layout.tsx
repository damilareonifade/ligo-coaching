import { Stack } from 'expo-router';

import { useThemeTokens } from '@/theme/tokens';

/**
 * Where a signed-out phone lands.
 *
 * Without this the group has no anchor and the stack opens on whichever
 * route sorts first — which is how someone launching the app for the very
 * first time could be shown a password reset form. The welcome screen is the
 * front door; login, reset and signup are all pushed on top of it and have a
 * back button to it.
 */
export const unstable_settings = {
  anchor: 'welcome',
};

export default function AuthLayout() {
  const tokens = useThemeTokens();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.background } }}
    />
  );
}
