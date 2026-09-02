import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { WeightUnit } from '@/lib/format';

import { mmkvStorage } from './mmkvStorage';

interface SettingsState {
  readonly unit: WeightUnit;
  readonly sessionReminders: boolean;
  readonly hasOnboarded: boolean;
  readonly setUnit: (unit: WeightUnit) => void;
  readonly setSessionReminders: (enabled: boolean) => void;
  readonly completeOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'kg',
      sessionReminders: true,
      hasOnboarded: false,
      setUnit: (unit) => set({ unit }),
      setSessionReminders: (sessionReminders) => set({ sessionReminders }),
      completeOnboarding: () => set({ hasOnboarded: true }),
    }),
    {
      name: 'ligo.settings',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ unit, sessionReminders, hasOnboarded }) => ({
        unit,
        sessionReminders,
        hasOnboarded,
      }),
    },
  ),
);
