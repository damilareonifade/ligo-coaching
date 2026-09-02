import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
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

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (status !== 'restoring') {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  const signedIn = status === 'signed-in';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: tokens.background },
              }}
            >
              <Stack.Protected guard={signedIn}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="student/[id]"
                  options={{
                    headerShown: true,
                    title: 'Student',
                    headerTintColor: tokens.navy,
                    headerStyle: { backgroundColor: tokens.background },
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
