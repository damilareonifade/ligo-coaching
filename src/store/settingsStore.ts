import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LengthUnit, WeightUnit } from '@/lib/units';

import { mmkvStorage } from './mmkvStorage';

interface SettingsState {
  /**
   * Weight. Kept under the name `unit` rather than `weightUnit` because it is
   * also the key in `public.cache`, and renaming it would strand the value
   * already synced to every signed-in device.
   */
  readonly unit: WeightUnit;
  readonly lengthUnit: LengthUnit;
  readonly sessionReminders: boolean;
  readonly hasOnboarded: boolean;
  readonly setUnit: (unit: WeightUnit) => void;
  readonly setLengthUnit: (unit: LengthUnit) => void;
  readonly setSessionReminders: (enabled: boolean) => void;
  readonly completeOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'kg',
      lengthUnit: 'cm',
      sessionReminders: true,
      hasOnboarded: false,
      setUnit: (unit) => set({ unit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setSessionReminders: (sessionReminders) => set({ sessionReminders }),
      completeOnboarding: () => set({ hasOnboarded: true }),
    }),
    {
      name: 'ligo.settings',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ unit, lengthUnit, sessionReminders, hasOnboarded }) => ({
        unit,
        lengthUnit,
        sessionReminders,
        hasOnboarded,
      }),
    },
  ),
);
