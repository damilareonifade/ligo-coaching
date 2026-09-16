import { create } from 'zustand';

import type { ApiProgramBlock, ApiProgramRoutine, BuilderKind, SetMeasure } from '@/api/types';
import { newBlock, resizeRoutines } from '@/lib/programs';

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

/** A program of one — what a standalone routine collapses to. */
const SINGLE_ROUTINE: ApiProgramRoutine = { id: 'routine-1', name: 'Exercises', blocks: [] };
const DEFAULT_ROUTINE_COUNT = 4;
const DEFAULT_WEEKS = 8;

export const WEEK_OPTIONS: readonly number[] = [4, 8, 12];
export const ROUTINE_COUNT_OPTIONS: readonly number[] = [3, 4, 5, 6];

interface ProgramDraftState {
  readonly kind: BuilderKind;
  readonly name: string;
  /** Free text about the routine as a whole. Programs do not surface it yet. */
  readonly note: string;
  readonly weeks: number;
  /** How often the client should train — a target, never a timetable. */
  readonly sessionsPerWeek: number;
  readonly routines: readonly ApiProgramRoutine[];
  readonly selectedRoutineId: string;
  readonly setKind: (kind: BuilderKind) => void;
  readonly setName: (name: string) => void;
  readonly setNote: (note: string) => void;
  readonly setWeeks: (weeks: number) => void;
  readonly setDaysPerWeek: (sessionsPerWeek: number) => void;
  readonly setRoutineCount: (routineCount: number) => void;
  readonly selectRoutine: (routineId: string) => void;
  /** Names a routine. "Routine 2" is a starting point, not a requirement. */
  readonly renameRoutine: (routineId: string, name: string) => void;
  /**
   * The catalogue row it came from, and how that row is measured — so a
   * treadmill is not opened asking for reps. Both absent for a name typed on
   * the create-exercise screen, which reads as load × reps.
   */
  readonly addBlock: (name: string, exerciseId?: string | null, measure?: SetMeasure) => void;
  readonly updateBlock: (blockId: string, patch: Partial<ApiProgramBlock>) => void;
  readonly removeBlock: (blockId: string) => void;
  /** Seed the draft from something already saved, for an edit. */
  readonly loadRoutine: (
    name: string,
    note: string,
    blocks: readonly ApiProgramBlock[],
  ) => void;
  readonly reset: () => void;
}

/** Keeps the selected tab pointing at a routine that still exists. */
function clampSelection(routines: readonly ApiProgramRoutine[], selectedRoutineId: string): string {
  return routines.some((routine) => routine.id === selectedRoutineId) ? selectedRoutineId : (routines[0]?.id ?? '');
}

const initial = {
  kind: 'program' as BuilderKind,
  name: '',
  note: '',
  weeks: DEFAULT_WEEKS,
  sessionsPerWeek: DEFAULT_ROUTINE_COUNT,
  routines: resizeRoutines([], DEFAULT_ROUTINE_COUNT),
  selectedRoutineId: 'routine-1',
};

export const useProgramDraftStore = create<ProgramDraftState>((set, get) => ({
  ...initial,

  // Switching kind keeps whatever was typed. A routine is a program of one,
  // so the blocks already entered move onto it rather than being thrown away.
  setKind: (kind) =>
    set((state) => {
      if (kind === state.kind) return state;
      const routines =
        kind === 'routine'
          ? [{ ...SINGLE_ROUTINE, blocks: state.routines[0]?.blocks ?? [] }]
          : resizeRoutines(state.routines, DEFAULT_ROUTINE_COUNT);
      return { kind, routines, selectedRoutineId: clampSelection(routines, state.selectedRoutineId) };
    }),

  setName: (name) => set({ name }),
  setNote: (note) => set({ note }),
  setWeeks: (weeks) => set({ weeks }),
  setDaysPerWeek: (sessionsPerWeek) => set({ sessionsPerWeek }),

  setRoutineCount: (routineCount) =>
    set((state) => {
      const routines = resizeRoutines(state.routines, routineCount);
      return {
        routines,
        // Training every routine of the split is the common case, so the target
        // follows the shape until a coach says otherwise.
        sessionsPerWeek: state.sessionsPerWeek === state.routines.length ? routineCount : state.sessionsPerWeek,
        selectedRoutineId: clampSelection(routines, state.selectedRoutineId),
      };
    }),

  selectRoutine: (routineId) => set({ selectedRoutineId: routineId }),

  renameRoutine: (routineId, name) =>
    set((state) => ({
      routines: state.routines.map((routine) =>
        routine.id === routineId ? { ...routine, name } : routine,
      ),
    })),

  addBlock: (name, exerciseId = null, measure) =>
    set((state) => ({
      routines: state.routines.map((routine) =>
        routine.id === state.selectedRoutineId
          ? { ...routine, blocks: [...routine.blocks, newBlock(name, exerciseId, measure)] }
          : routine,
      ),
    })),

  // Every routine is searched rather than just the selected one: a block id is
  // unique across the draft, and scoping the edit to the open tab would fail
  // silently the moment anything edits a block from somewhere else.
  updateBlock: (blockId, patch) =>
    set((state) => ({
      routines: state.routines.map((routine) => ({
        ...routine,
        blocks: routine.blocks.map((block) =>
          block.id === blockId ? { ...block, ...patch } : block,
        ),
      })),
    })),

  removeBlock: (blockId) =>
    set((state) => ({
      routines: state.routines.map((routine) => ({
        ...routine,
        blocks: routine.blocks.filter((block) => block.id !== blockId),
      })),
    })),

  loadRoutine: (name, note, blocks) =>
    set({
      kind: 'routine',
      name,
      note,
      weeks: 1,
      sessionsPerWeek: 1,
      routines: [{ ...SINGLE_ROUTINE, blocks }],
      selectedRoutineId: SINGLE_ROUTINE.id,
    }),

  /** Called when the builder opens, so a saved draft never haunts the next one. */
  reset: () => set({ ...initial, routines: resizeRoutines([], DEFAULT_ROUTINE_COUNT) }),
}));

/** The routine the builder is editing — the one the picker adds to. */
export function selectDraftRoutine(state: ProgramDraftState): ApiProgramRoutine | null {
  return state.routines.find((routine) => routine.id === state.selectedRoutineId) ?? state.routines[0] ?? null;
}
