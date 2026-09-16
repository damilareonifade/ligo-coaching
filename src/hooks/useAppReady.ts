import { useFonts } from 'expo-font';
import { useCallback, useState } from 'react';

import { useAuthStore } from '@/store/authStore';

export interface AppReady {
  /** Everything the first screen needs is loaded: fonts, and a settled session. */
  readonly ready: boolean;
  /** Whether the splash overlay should still be mounted. */
  readonly showSplash: boolean;
  /** Handed to the overlay; called once its curtain is off-screen. */
  readonly onSplashComplete: () => void;
}

/**
 * What the splash is waiting for, and when it is allowed to leave.
 *
 * Two separate conditions on purpose. `ready` is about the app — it gates
 * the navigator, and it gates the start of the overlay's exit so the sweep
 * never uncovers a half-built screen. `showSplash` is about the animation,
 * and only the overlay itself can say when that is done; a timer here would
 * either cut the sweep short or hold a finished one on screen.
 */
export function useAppReady(): AppReady {
  const [splashDone, setSplashDone] = useState(false);
  const status = useAuthStore((state) => state.status);

  // Onboarding/signup flow only — see AGENTS.md scope. One RN font-family
  // name per weight file; RN cannot reliably switch weights on one family.
  const [fontsLoaded, fontError] = useFonts({
    'Geist-Regular': require('../../assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('../../assets/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('../../assets/fonts/Geist-SemiBold.ttf'),
    'Geist-Bold': require('../../assets/fonts/Geist-Bold.ttf'),
  });

  // A font that failed counts as ready. The alternative is a splash that
  // never leaves, which is a worse outcome than system type for one session.
  const ready = (fontsLoaded || fontError !== null) && status !== 'restoring';

  return {
    ready,
    showSplash: !splashDone,
    onSplashComplete: useCallback(() => setSplashDone(true), []),
  };
}
