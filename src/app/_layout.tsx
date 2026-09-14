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
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { useAuthStore } from '@/store/authStore';
import { hasFeature } from '@/lib/features';
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

  // Preferences follow the account between devices — see public.cache.
  useSettingsSync();

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
                {/* The coach's review of one client. Titled "Client" rather
                    than for the person: their name is the card at the top,
                    exactly as in every thread in the app. */}
                <Stack.Screen name="student/[id]" />
                {/* Watching a session in progress. A route off the review
                    rather than a mode inside it: it is read-only, it is over
                    when the client finishes, and it should be somewhere a
                    coach can leave with a back button. */}
                <Stack.Screen name="student/[id]/live" />
                {/* One client's copy of a routine, open to the coach. A route
                    off the client review rather than off the program library:
                    what is edited here is that person's copy, not the
                    template it came from. */}
                <Stack.Screen name="student/[id]/routines/[routineId]" />
                {/* The client's own routines. Their counterpart to the coach's
                    builder, and deliberately not in that stack: what a client
                    builds is theirs, never enters the coach's library, and
                    never displaces the plan they are being coached through. */}
                <Stack.Screen name="routines/new" />
                <Stack.Screen name="routines/[id]" />
                {/* Guarded rather than merely unlinked. A flag that only hides
                    the entrance leaves the room standing: the Notification
                    settings screen stayed reachable from a back stack opened
                    before the flag, and answered with a dead host's error. An
                    absent feature has absent routes, and a deep link to one
                    lands on +not-found. */}
                <Stack.Protected guard={hasFeature('food')}>
                  <Stack.Screen name="food/search" />
                  <Stack.Screen name="food/new" />
                </Stack.Protected>
                {/* The coach's feed. A full screen rather than a tab: it is
                    read in a sitting and left, and it hands off to the client
                    it is talking about. */}
                <Stack.Screen name="notifications" />
                {/* One client's thread, off the Messages tab. Titled for the
                    thread, not the client — their name is the card at the top,
                    exactly as on the client's own side. */}
                <Stack.Screen name="messages/[clientId]" />
                {/* The coach's own filing system — a roster detail, not a
                    profile setting, so it hangs off the roster route. */}
                <Stack.Screen name="roster/labels" />
                {/* The coach's library and editor. Four full-screen routes off
                    the Programs tab, in the order a program is built: open it,
                    build it, pick a lift, invent one that is not in the list. */}
                <Stack.Screen name="programs/[id]" />
                <Stack.Screen name="programs/builder" />
                <Stack.Screen name="programs/assign" />
                <Stack.Screen name="programs/picker" />
                <Stack.Screen name="programs/new-exercise" />
                <Stack.Protected guard={hasFeature('notifications')}>
                  <Stack.Screen name="profile/notifications" />
                </Stack.Protected>
                <Stack.Protected guard={hasFeature('integrations')}>
                  <Stack.Screen name="profile/integrations" />
                </Stack.Protected>
                <Stack.Screen name="profile/data" />
                <Stack.Screen name="profile/units" />
                <Stack.Screen name="profile/permissions" />
                <Stack.Screen name="profile/health" />
                {/* The coach's own public face — Settings → Account → Profile. */}
                <Stack.Screen name="coach/profile" />
                {/* Titled for the thread, not the coach: navigation options live
                    here, and the coach's name is already the card at the top. */}
                <Stack.Screen name="coach/chat" />
                <Stack.Screen name="check-ins/index" />
                <Stack.Screen name="check-ins/edit" />
                {/* Community. Both seats route through the same stack: the
                    client reaches the index from their profile, the coach
                    reaches the two creators and any group from Messages.

                    The consent screens are full routes rather than sheets on
                    purpose. Accepting an invitation and joining a board are
                    decisions about what other people can see, and a decision
                    like that should have a screen of its own and a back
                    button, not a card that can be swiped away by accident. */}
                <Stack.Protected guard={hasFeature('community')}>
                <Stack.Screen name="community/index" />
                <Stack.Screen name="community/invite/[id]" />
                {/* Titled "Group" here and narrowed to the group's own name by
                    the screen once the fetch lands — the layout cannot know it
                    before then. */}
                <Stack.Screen name="community/group/[id]" />
                <Stack.Screen name="community/board/[id]/index" />
                <Stack.Screen name="community/board/[id]/opt-in" />
                <Stack.Screen name="community/new-group" />
                <Stack.Screen name="community/new-board" />
                </Stack.Protected>
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
