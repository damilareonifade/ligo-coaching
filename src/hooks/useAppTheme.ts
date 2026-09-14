import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';

import { useSettingsStore } from '@/store/settingsStore';

/**
 * Applies the chosen theme to NativeWind, once, near the root.
 *
 * `colorScheme.set('system')` hands the decision back to the OS, so the app
 * follows a phone that darkens at sunset without anything here listening for
 * it. The two explicit values override that until they are changed.
 *
 * Called from `src/app/_layout.tsx` and nowhere else — two callers would race
 * to set the same global.
 */
export function useAppTheme(): void {
  const theme = useSettingsStore((state) => state.theme);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [setColorScheme, theme]);
}
