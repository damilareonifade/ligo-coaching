import {
  mockDeleteOwnRoutines,
  mockDeleteRoutineInstance,
  mockRoutineInstance,
  mockSaveRoutineInstance,
  mockTrainOverview,
} from '@/api/mocks';
import type { ApiProgramBlock, ApiRoutineInstance } from '@/api/types';

function own(id: string, name: string, note: string | null = null): ApiRoutineInstance {
  return {
    id,
    templateId: null,
    clientId: 'client-maya',
    name,
    note,
    blocks,
    orderIndex: 0,
    lastCompletedAt: null,
    baseVersion: null,
    diverged: false,
    pendingUpdate: null,
  };
}

const blocks: readonly ApiProgramBlock[] = [
  { id: 'blk-a', name: 'Back squat', scheme: '5 × 5', rpe: 'RPE 7', note: null },
  { id: 'blk-b', name: 'Romanian deadlift', scheme: '3 × 10', rpe: '', note: null },
];

/**
 * The ownership rule lives in the data, not only the UI: a routine the client
 * saves has to reach their list and nothing else.
 */
describe('client routines', () => {
  it('saves a new routine into the client’s own list', () => {
    mockSaveRoutineInstance(own('rou-test-1', 'Leg day'));

    const saved = mockTrainOverview().routines.find((routine) => routine.id === 'rou-test-1');
    expect(saved?.name).toBe('Leg day');
    expect(saved?.owner).toBe('you');

    mockDeleteRoutineInstance('rou-test-1');
  });

  it('carries the routine’s own note onto the card', () => {
    mockSaveRoutineInstance(own('rou-test-2', 'Leg day', 'Knees out on the squat.'));

    const saved = mockTrainOverview().routines.find((routine) => routine.id === 'rou-test-2');
    expect(saved?.note).toBe('Knees out on the squat.');

    mockDeleteRoutineInstance('rou-test-2');
  });

  it('never marks a client routine current — the coach’s plan holds that spot', () => {
    mockSaveRoutineInstance(own('rou-test-3', 'Arms'));

    const overview = mockTrainOverview();
    const mine = overview.routines.filter((routine) => routine.owner === 'you');
    expect(mine.every((routine) => !routine.isCurrent)).toBe(true);

    // The coach's routines still lead the list, whatever the client built.
    expect(overview.routines[0].owner).toBe('coach');
    expect(overview.routines[0].isCurrent).toBe(true);

    mockDeleteRoutineInstance('rou-test-3');
  });

  it('reads one back, and forgets it once deleted', () => {
    mockSaveRoutineInstance(own('rou-test-4', 'Arms'));
    expect(mockRoutineInstance('rou-test-4')?.blocks).toHaveLength(2);

    mockDeleteRoutineInstance('rou-test-4');
    expect(mockRoutineInstance('rou-test-4')).toBeNull();
    expect(
      mockTrainOverview().routines.some((routine) => routine.id === 'rou-test-4'),
    ).toBe(false);
  });
});

/** "Delete all" means the client's own — a coach's routine is not theirs. */
describe('deleting every client routine', () => {
  it('clears the client’s own and leaves the coach’s standing', () => {
    mockSaveRoutineInstance(own('rou-test-5', 'Arms'));
    mockSaveRoutineInstance(own('rou-test-6', 'Legs'));

    mockDeleteOwnRoutines();

    const routines = mockTrainOverview().routines;
    expect(routines.some((routine) => routine.owner === 'you')).toBe(false);
    expect(routines.filter((routine) => routine.owner === 'coach').length).toBeGreaterThan(0);
  });
});
