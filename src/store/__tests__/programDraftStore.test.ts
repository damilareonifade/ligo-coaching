import { selectDraftRoutine, useProgramDraftStore } from '@/store/programDraftStore';

function draftBlocks() {
  return selectDraftRoutine(useProgramDraftStore.getState())?.blocks ?? [];
}

describe('programDraftStore — editing a block', () => {
  beforeEach(() => {
    useProgramDraftStore.getState().reset();
  });

  it('changes the scheme on the block that was tapped, and no other', () => {
    const store = useProgramDraftStore.getState();
    store.addBlock('Bench press');
    store.addBlock('Cable fly');

    const [bench, fly] = draftBlocks();
    useProgramDraftStore.getState().updateBlock(bench.id, { scheme: '5 × 5', rpe: 'RPE 8' });

    const [editedBench, untouchedFly] = draftBlocks();
    expect(editedBench.scheme).toBe('5 × 5');
    expect(editedBench.rpe).toBe('RPE 8');
    expect(editedBench.name).toBe('Bench press');
    expect(untouchedFly.scheme).toBe(fly.scheme);
    expect(untouchedFly.rpe).toBe('');
  });

  /**
   * A block id is unique across the draft, so an edit must not depend on which
   * routine tab happens to be open — scoping it there would fail silently.
   */
  it('finds a block on a routine that is not the selected one', () => {
    const store = useProgramDraftStore.getState();
    store.setKind('program');
    store.addBlock('Back squat');

    const [squat] = draftBlocks();
    const routines = useProgramDraftStore.getState().routines;
    useProgramDraftStore.getState().selectRoutine(routines[1].id);

    useProgramDraftStore.getState().updateBlock(squat.id, { scheme: '3 × 3' });

    const edited = useProgramDraftStore
      .getState()
      .routines.flatMap((routine) => routine.blocks)
      .find((block) => block.id === squat.id);
    expect(edited?.scheme).toBe('3 × 3');
  });

  it('ignores an id that is not in the draft', () => {
    useProgramDraftStore.getState().addBlock('Bench press');
    useProgramDraftStore.getState().updateBlock('blk-nope', { scheme: '9 × 9' });

    expect(draftBlocks()).toHaveLength(1);
    expect(draftBlocks()[0].scheme).not.toBe('9 × 9');
  });

  it('loads a saved routine in for editing', () => {
    useProgramDraftStore
      .getState()
      .loadRoutine('Leg routine', 'Knees out.', [
        { id: 'blk-a', name: 'Back squat', scheme: '5 × 5', rpe: 'RPE 7', note: null },
      ]);

    const state = useProgramDraftStore.getState();
    expect(state.kind).toBe('routine');
    expect(state.name).toBe('Leg routine');
    expect(state.note).toBe('Knees out.');
    expect(draftBlocks()).toHaveLength(1);
    expect(draftBlocks()[0].name).toBe('Back squat');
  });
});

/** "Day 2" is a starting point, not a requirement. */
describe('programDraftStore — naming a routine', () => {
  beforeEach(() => {
    useProgramDraftStore.getState().reset();
  });

  it('renames the routine asked for, and no other', () => {
    const before = useProgramDraftStore.getState().routines;
    useProgramDraftStore.getState().renameRoutine(before[1].id, 'Lower A');

    const after = useProgramDraftStore.getState().routines;
    expect(after[1].name).toBe('Lower A');
    expect(after[0].name).toBe(before[0].name);
  });

  it('keeps the name when the split grows', () => {
    const store = useProgramDraftStore.getState();
    store.renameRoutine(store.routines[0].id, 'Upper A');

    useProgramDraftStore.getState().setRoutineCount(6);

    const routines = useProgramDraftStore.getState().routines;
    expect(routines).toHaveLength(6);
    expect(routines[0].name).toBe('Upper A');
    // New routines still arrive named rather than blank — a starting point.
    expect(routines[5].name).toBe('Routine 6');
  });

  it('keeps the blocks on a renamed routine', () => {
    const store = useProgramDraftStore.getState();
    store.addBlock('Bench press');
    store.renameRoutine(store.routines[0].id, 'Upper A');

    const routine = useProgramDraftStore.getState().routines[0];
    expect(routine.name).toBe('Upper A');
    expect(routine.blocks).toHaveLength(1);
  });
});
