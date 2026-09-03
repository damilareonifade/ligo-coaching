import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createQueryClient } from '@/api/queryClient';
import { LIToastHost } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { tokens } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function RootLayout() {
  // One client for the app's lifetime — recreating it would drop the cache.
  const [queryClient] = useState(createQueryClient);
  const status = useAuthStore((state) => state.status);
  const restore = useAuthStore((state) => state.restore);

  // Onboarding/signup flow only — see AGENTS.md scope. One RN font-family
  // name per weight file; RN cannot reliably switch weights on one family.
  const [fontsLoaded] = useFonts({
    'Geist-Regular': require('../../assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('../../assets/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('../../assets/fonts/Geist-SemiBold.ttf'),
    'Geist-Bold': require('../../assets/fonts/Geist-Bold.ttf'),
  });

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (status !== 'restoring' && fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [status, fontsLoaded]);

  const signedIn = status === 'signed-in';

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: tokens.canvas },
              }}
            >
              <Stack.Protected guard={signedIn}>
                <Stack.Screen name="(tabs)" />
                {/* Signup signs the user in before routing here, so onboarding
                    has to live on the signed-in side of the guard. */}
                <Stack.Screen name="onboarding" />
                <Stack.Screen
                  name="student/[id]"
                  options={{
                    headerShown: true,
                    title: 'Student',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="session/[id]"
                  options={{
                    headerShown: true,
                    title: 'Workout',
                    // Without this the back button reads "(tabs)" — the route
                    // group name leaks into the UI as the default back title.
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="food/search"
                  options={{
                    headerShown: true,
                    title: 'Add food',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="food/new"
                  options={{
                    headerShown: true,
                    title: 'New food',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                {/* The coach's feed. A full screen rather than a tab: it is
                    read in a sitting and left, and it hands off to the client
                    it is talking about. */}
                <Stack.Screen
                  name="activity"
                  options={{
                    headerShown: true,
                    title: 'Activity',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                {/* One client's thread, off the Messages tab. Titled for the
                    thread, not the client — their name is the card at the top,
                    exactly as on the client's own side. */}
                <Stack.Screen
                  name="messages/[clientId]"
                  options={{
                    headerShown: true,
                    title: 'Messages',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                {/* The coach's own filing system — a roster detail, not a
                    profile setting, so it hangs off the roster route. */}
                <Stack.Screen
                  name="roster/labels"
                  options={{
                    headerShown: true,
                    title: 'Labels',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                {/* The coach's library and editor. Four full-screen routes off
                    the Programs tab, in the order a program is built: open it,
                    build it, pick a lift, invent one that is not in the list. */}
                <Stack.Screen
                  name="programs/[id]"
                  options={{
                    headerShown: true,
                    title: 'Program',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="programs/builder"
                  options={{
                    headerShown: true,
                    title: 'New program',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="programs/picker"
                  options={{
                    headerShown: true,
                    title: 'Add exercise',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="programs/new-exercise"
                  options={{
                    headerShown: true,
                    title: 'New exercise',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="profile/notifications"
                  options={{
                    headerShown: true,
                    title: 'Notifications',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="profile/integrations"
                  options={{
                    headerShown: true,
                    title: 'Integrations',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="profile/data"
                  options={{
                    headerShown: true,
                    title: 'Data & privacy',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="profile/health"
                  options={{
                    headerShown: true,
                    title: 'Health profile',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                {/* Titled for the thread, not the coach: navigation options live
                    here, and the coach's name is already the card at the top. */}
                <Stack.Screen
                  name="coach/chat"
                  options={{
                    headerShown: true,
                    title: 'Messages',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="check-ins/index"
                  options={{
                    headerShown: true,
                    title: 'Monthly check-ins',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
                <Stack.Screen
                  name="check-ins/edit"
                  options={{
                    headerShown: true,
                    title: 'Check-in',
                    headerBackTitle: 'Back',
                    headerTintColor: tokens.violet,
                    headerStyle: { backgroundColor: tokens.canvas },
                  }}
                />
              </Stack.Protected>

              <Stack.Protected guard={!signedIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
            </Stack>
            <LIToastHost />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
