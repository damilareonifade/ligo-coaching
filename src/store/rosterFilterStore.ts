import { create } from 'zustand';

interface RosterFilterState {
  /** `null` is "all labels". The one roster filter two screens can both set. */
  readonly labelId: string | null;
  readonly setLabelId: (labelId: string | null) => void;
}

/**
 * Deliberately not persisted. Search, status and sort stay local to the roster
 * screen — this one is here only because the labels screen filters the roster
 * and then pops back, so the two screens have to agree on it. A filter that
 * outlived the app would be a roster silently hiding people on next launch.
 */
export const useRosterFilterStore = create<RosterFilterState>((set) => ({
  labelId: null,
  setLabelId: (labelId) => set({ labelId }),
}));
