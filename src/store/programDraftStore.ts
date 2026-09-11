import { create } from 'zustand';

import type { ApiProgramDay, BuilderKind } from '@/api/types';
import { newBlock, resizeDays } from '@/lib/programs';

/**
 * The builder's draft, in Zustand rather than a `useReducer` in the screen,
 * because the exercise picker is a separate route: a coach leaves the builder
 * to pick a lift and comes back expecting the draft intact, and a reducer that
 * unmounts with the screen cannot survive that trip.
 *
 * Deliberately **not** persisted. An unsaved program is a thought in progress,
 * not a document — resurrecting one a week later, half-built and unassigned,
 * would be worse than starting over.
 */

const ROUTINE_DAY: ApiProgramDay = { id: 'day-1', label: 'Exercises', blocks: [] };
const DEFAULT_DAY_COUNT = 4;
const DEFAULT_WEEKS = 8;

export const WEEK_OPTIONS: readonly number[] = [4, 8, 12];
export const DAY_COUNT_OPTIONS: readonly number[] = [3, 4, 5, 6];

interface ProgramDraftState {
  readonly kind: BuilderKind;
  readonly name: string;
  readonly weeks: number;
  readonly days: readonly ApiProgramDay[];
  readonly selectedDayId: string;
  readonly setKind: (kind: BuilderKind) => void;
  readonly setName: (name: string) => void;
  readonly setWeeks: (weeks: number) => void;
  readonly setDayCount: (dayCount: number) => void;
  readonly selectDay: (dayId: string) => void;
  readonly addBlock: (name: string) => void;
  readonly removeBlock: (blockId: string) => void;
  readonly reset: () => void;
}

/** Keeps the selected tab pointing at a day that still exists. */
function clampSelection(days: readonly ApiProgramDay[], selectedDayId: string): string {
  return days.some((day) => day.id === selectedDayId) ? selectedDayId : (days[0]?.id ?? '');
}

const initial = {
  kind: 'program' as BuilderKind,
  name: '',
  weeks: DEFAULT_WEEKS,
  days: resizeDays([], DEFAULT_DAY_COUNT),
  selectedDayId: 'day-1',
};

export const useProgramDraftStore = create<ProgramDraftState>((set, get) => ({
  ...initial,

  // Switching kind keeps whatever was typed. A routine is one day, so the
  // blocks already entered move onto it rather than being thrown away.
  setKind: (kind) =>
    set((state) => {
      if (kind === state.kind) return state;
      const days =
        kind === 'routine'
          ? [{ ...ROUTINE_DAY, blocks: state.days[0]?.blocks ?? [] }]
          : resizeDays(state.days, DEFAULT_DAY_COUNT);
      return { kind, days, selectedDayId: clampSelection(days, state.selectedDayId) };
    }),

  setName: (name) => set({ name }),
  setWeeks: (weeks) => set({ weeks }),

  setDayCount: (dayCount) =>
    set((state) => {
      const days = resizeDays(state.days, dayCount);
      return { days, selectedDayId: clampSelection(days, state.selectedDayId) };
    }),

  selectDay: (dayId) => set({ selectedDayId: dayId }),

  addBlock: (name) =>
    set((state) => ({
      days: state.days.map((day) =>
        day.id === state.selectedDayId ? { ...day, blocks: [...day.blocks, newBlock(name)] } : day,
      ),
    })),

  removeBlock: (blockId) =>
    set((state) => ({
      days: state.days.map((day) => ({
        ...day,
        blocks: day.blocks.filter((block) => block.id !== blockId),
      })),
    })),

  /** Called when the builder opens, so a saved draft never haunts the next one. */
  reset: () => set({ ...initial, days: resizeDays([], DEFAULT_DAY_COUNT) }),
}));

/** The day the builder is editing — the one the picker adds to. */
export function selectDraftDay(state: ProgramDraftState): ApiProgramDay | null {
  return state.days.find((day) => day.id === state.selectedDayId) ?? state.days[0] ?? null;
}
