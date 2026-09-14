import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LengthUnit, WeightUnit } from '@/lib/units';

import { mmkvStorage } from './mmkvStorage';

/** 'system' follows the OS and is the default; the other two override it. */
export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  /**
   * Weight. Kept under the name `unit` rather than `weightUnit` because it is
   * also the key in `public.cache`, and renaming it would strand the value
   * already synced to every signed-in device.
   */
  readonly unit: WeightUnit;
  readonly lengthUnit: LengthUnit;
  readonly theme: ThemePreference;
  readonly sessionReminders: boolean;
  readonly hasOnboarded: boolean;
  readonly setUnit: (unit: WeightUnit) => void;
  readonly setLengthUnit: (unit: LengthUnit) => void;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly setSessionReminders: (enabled: boolean) => void;
  readonly completeOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'kg',
      lengthUnit: 'cm',
      theme: 'system',
      sessionReminders: true,
      hasOnboarded: false,
      setUnit: (unit) => set({ unit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setTheme: (theme) => set({ theme }),
      setSessionReminders: (sessionReminders) => set({ sessionReminders }),
      completeOnboarding: () => set({ hasOnboarded: true }),
    }),
    {
      name: 'ligo.settings',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ unit, lengthUnit, theme, sessionReminders, hasOnboarded }) => ({
        unit,
        lengthUnit,
        theme,
        sessionReminders,
        hasOnboarded,
      }),
    },
  ),
);
