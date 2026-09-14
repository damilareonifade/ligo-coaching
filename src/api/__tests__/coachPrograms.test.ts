import { composeProgram, type SaveProgramInput } from '@/api/coachPrograms';
import type { ApiProgramRoutine } from '@/api/types';

const routines: readonly ApiProgramRoutine[] = [
  {
    id: 'day-1',
    name: 'Exercises',
    blocks: [
      { id: 'blk-1', name: 'Bench press', scheme: '4 × 8', rpe: 'RPE 8', note: null },
    ],
  },
];

function input(overrides: Partial<SaveProgramInput> = {}): SaveProgramInput {
  return {
    name: 'Upper A',
    note: null,
    kind: 'routine',
    weeks: 1,
    sessionsPerWeek: 1,
    routines,
    ...overrides,
  };
}

/**
 * The coach's builder shares its setup card with the client's, so the Note box
 * is on screen for both. It has to be carried through the save — a field that
 * accepts typing and silently drops it is worse than no field.
 */
describe('composeProgram — the note', () => {
  it('keeps what the coach typed', () => {
    const program = composeProgram(input({ note: 'Four days a week, eight weeks.' }), null);

    expect(program.note).toBe('Four days a week, eight weeks.');
  });

  it('trims it', () => {
    expect(composeProgram(input({ note: '  Keep it light.  ' }), null).note).toBe('Keep it light.');
  });

  it('stores an emptied box as no note, not a blank one', () => {
    expect(composeProgram(input({ note: '' }), null).note).toBeNull();
    expect(composeProgram(input({ note: '   ' }), null).note).toBeNull();
    expect(composeProgram(input({ note: null }), null).note).toBeNull();
  });

  it('clears a note the coach deleted, rather than keeping the old one', () => {
    const existing = composeProgram(input({ note: 'Old note' }), null);
    const edited = composeProgram(input({ id: existing.id, note: null }), existing);

    expect(edited.note).toBeNull();
  });
});
