import {
  mockAssignProgram,
  mockDeleteOwnRoutines,
  mockDeleteRoutineInstance,
  mockSaveRoutineInstance,
  mockRoutineInstance,
  mockRoutineInstances,
  mockAcceptUpdate,
  mockDeclineUpdate,
  mockProposeUpdate,
  mockPublishImpact,
  mockProgramHolders,
  mockRoutinesForClient,
  mockUnassignProgram,
  mockTrainOverview,
} from '@/api/mocks';

/**
 * Assignment copies. That one property is what the whole sharing model rests
 * on — a pointer would make "change it for one client only" inexpressible, and
 * would let a client's edit reach everybody.
 */
describe('assigning a program', () => {
  it('gives each client their own instance', () => {
    const created = mockAssignProgram('pg-strength-5x5', ['client-a', 'client-b']);

    const owners = created.map((instance) => instance.clientId);
    expect(owners).toContain('client-a');
    expect(owners).toContain('client-b');
    expect(new Set(created.map((instance) => instance.id)).size).toBe(created.length);
  });

  it('copies the blocks rather than sharing them', () => {
    const [first] = mockAssignProgram('pg-strength-5x5', ['client-c']);
    const [second] = mockAssignProgram('pg-strength-5x5', ['client-d']);

    expect(first.blocks.length).toBeGreaterThan(0);
    expect(first.blocks[0]).not.toBe(second.blocks[0]);
    expect(first.blocks[0]).toEqual(second.blocks[0]);
  });

  it('remembers the template it came from, and the revision', () => {
    const [instance] = mockAssignProgram('pg-strength-5x5', ['client-e']);

    expect(instance.templateId).toBe('pg-strength-5x5');
    expect(instance.baseVersion).not.toBeNull();
  });

  it('starts undiverged, with nothing pending', () => {
    const [instance] = mockAssignProgram('pg-strength-5x5', ['client-f']);

    expect(instance.diverged).toBe(false);
    expect(instance.pendingUpdate).toBeNull();
  });

  /** An instance is one session — the rule `BuilderKind` already states. */
  it('splits a multi-day program into one instance per day', () => {
    const created = mockAssignProgram('pg-upper-lower', ['client-g']);

    expect(created.length).toBeGreaterThan(1);
    expect(new Set(created.map((instance) => instance.name)).size).toBe(created.length);
    expect(created[0].name).toContain('Upper/Lower 4×');
  });

  it('ignores a program that does not exist', () => {
    expect(mockAssignProgram('pg-nope', ['client-h'])).toEqual([]);
  });
});

describe('the instances a client holds', () => {
  it('are what the Train tab lists', () => {
    const held = mockRoutineInstances().filter((instance) => instance.clientId === 'client-maya');
    const cards = mockTrainOverview().routines;

    for (const instance of held) {
      expect(cards.some((card) => card.id === instance.id)).toBe(true);
    }
  });

  it('read as coming from the coach when a template is behind them', () => {
    const instance = mockRoutineInstance('rou-1');
    expect(instance?.templateId).not.toBeNull();

    const card = mockTrainOverview().routines.find((routine) => routine.id === 'rou-1');
    expect(card?.owner).toBe('coach');
    expect(card?.sourceLabel).toBe('From Sam');
  });

  it('read as the client’s own when nothing is behind them', () => {
    const card = mockTrainOverview().routines.find((routine) => routine.id === 'rou-2');
    expect(card?.owner).toBe('you');
    expect(card?.sourceLabel).toBe('Yours');
  });

  it('preview the first few lifts, not the whole routine', () => {
    const card = mockTrainOverview().routines.find((routine) => routine.id === 'rou-1');
    expect(card?.preview.length).toBeLessThanOrEqual(3);
    expect(card?.preview[0]?.name).toBe('Bench press');
  });
});

/**
 * One store, one model. A routine the client built and a copy of the coach's
 * differ by exactly one field — which is what lets a single editor, a single
 * set of endpoints and a single card serve both.
 */
describe('own routines are instances too', () => {
  it('sit in the same store, with nothing behind them', () => {
    const own = mockRoutineInstance('rou-2');

    expect(own).not.toBeNull();
    expect(own?.templateId).toBeNull();
    expect(own?.baseVersion).toBeNull();
  });

  it('list after the coach’s, never before', () => {
    const cards = mockTrainOverview().routines;
    const lastCoach = cards.map((card) => card.owner).lastIndexOf('coach');
    const firstOwn = cards.map((card) => card.owner).indexOf('you');

    expect(lastCoach).toBeLessThan(firstOwn);
  });

  it('are the only ones "delete all mine" removes', () => {
    mockDeleteOwnRoutines();

    const left = mockRoutineInstances();
    expect(left.every((instance) => instance.templateId !== null)).toBe(true);
    expect(left.length).toBeGreaterThan(0);
  });
});

describe('editing a copy of the coach’s routine', () => {
  it('marks it diverged, and leaves the template pointer alone', () => {
    const [assigned] = mockAssignProgram('pg-strength-5x5', ['client-div']);

    mockSaveRoutineInstance({ ...assigned, name: 'My version', diverged: true });

    const edited = mockRoutineInstance(assigned.id);
    expect(edited?.name).toBe('My version');
    expect(edited?.diverged).toBe(true);
    expect(edited?.templateId).toBe('pg-strength-5x5');

    mockDeleteRoutineInstance(assigned.id);
  });

  it('does not touch another client’s copy of the same routine', () => {
    const [mine] = mockAssignProgram('pg-strength-5x5', ['client-one']);
    const [theirs] = mockAssignProgram('pg-strength-5x5', ['client-two']);

    mockSaveRoutineInstance({ ...mine, name: 'Mine only', diverged: true });

    expect(mockRoutineInstance(theirs.id)?.name).not.toBe('Mine only');
    expect(mockRoutineInstance(theirs.id)?.diverged).toBe(false);

    mockDeleteRoutineInstance(mine.id);
    mockDeleteRoutineInstance(theirs.id);
  });
});

/** What the card says once a client has changed a copy of the coach's. */
describe('a copy the client has edited', () => {
  it('still reads as the coach’s, and says it was changed', () => {
    const [assigned] = mockAssignProgram('pg-strength-5x5', ['client-maya']);
    mockSaveRoutineInstance({ ...assigned, diverged: true });

    const card = mockTrainOverview().routines.find((routine) => routine.id === assigned.id);
    expect(card?.owner).toBe('coach');
    expect(card?.sourceLabel).toBe('From Sam · edited by you');

    mockDeleteRoutineInstance(assigned.id);
  });

  it('says only "From Sam" while it still matches', () => {
    const card = mockTrainOverview().routines.find((routine) => routine.id === 'rou-4');
    expect(card?.sourceLabel).toBe('From Sam');
  });
});

/**
 * A coach editing one client's copy is the whole reason assignment copies.
 * The property worth pinning is the negative one: it must not touch anybody
 * else, and it must not touch the template.
 */
describe('the coach editing one client’s copy', () => {
  it('changes that client and no other', () => {
    const [mine] = mockAssignProgram('pg-strength-5x5', ['client-x']);
    const [theirs] = mockAssignProgram('pg-strength-5x5', ['client-y']);

    mockSaveRoutineInstance({ ...mine, name: 'Lighter for you', diverged: true });

    expect(mockRoutineInstance(mine.id)?.name).toBe('Lighter for you');
    expect(mockRoutineInstance(theirs.id)?.name).not.toBe('Lighter for you');

    mockDeleteRoutineInstance(mine.id);
    mockDeleteRoutineInstance(theirs.id);
  });

  it('lists only that client’s copies to edit', () => {
    mockAssignProgram('pg-strength-5x5', ['client-only-mine']);

    const held = mockRoutinesForClient('client-only-mine');
    expect(held.length).toBeGreaterThan(0);
    expect(held.every((instance) => instance.clientId === 'client-only-mine')).toBe(true);

    for (const instance of held) mockDeleteRoutineInstance(instance.id);
  });
});

/**
 * Publish is a proposal. Nobody is updated silently — not even a client whose
 * copy still matches the template, because it is their copy either way.
 */
describe('publishing a template', () => {
  const assignTwo = () => [
    mockAssignProgram('pg-strength-5x5', ['pub-a'])[0],
    mockAssignProgram('pg-strength-5x5', ['pub-b'])[0],
  ];

  const cleanUp = (ids: readonly string[]) => ids.forEach(mockDeleteRoutineInstance);

  it('changes nobody’s routine on its own', () => {
    const [a, b] = assignTwo();
    const before = mockRoutineInstance(a.id)?.blocks;

    mockProposeUpdate('pg-strength-5x5');

    expect(mockRoutineInstance(a.id)?.blocks).toEqual(before);
    expect(mockRoutineInstance(a.id)?.pendingUpdate).not.toBeNull();

    cleanUp([a.id, b.id]);
  });

  it('asks every holder, changed or not', () => {
    const [a, b] = assignTwo();
    mockSaveRoutineInstance({ ...a, diverged: true });

    const proposed = mockProposeUpdate('pg-strength-5x5');

    expect(proposed).toBeGreaterThanOrEqual(2);
    expect(mockRoutineInstance(a.id)?.pendingUpdate).not.toBeNull();
    expect(mockRoutineInstance(b.id)?.pendingUpdate).not.toBeNull();

    cleanUp([a.id, b.id]);
  });

  it('tells the coach who holds it and who has changed theirs', () => {
    const [a, b] = assignTwo();
    mockSaveRoutineInstance({ ...a, diverged: true });

    const impact = mockPublishImpact('pg-strength-5x5');
    expect(impact.holders).toBeGreaterThanOrEqual(2);
    expect(impact.changed).toBeGreaterThanOrEqual(1);

    cleanUp([a.id, b.id]);
  });
});

describe('the client answering', () => {
  const assignOne = () => mockAssignProgram('pg-strength-5x5', ['decide-me'])[0];

  it('takes the update: the copy becomes it, and matches again', () => {
    const instance = assignOne();
    mockSaveRoutineInstance({ ...instance, diverged: true });
    mockProposeUpdate('pg-strength-5x5');

    const proposed = mockRoutineInstance(instance.id)?.pendingUpdate;
    mockAcceptUpdate(instance.id);

    const after = mockRoutineInstance(instance.id);
    expect(after?.blocks).toEqual(proposed?.blocks);
    expect(after?.diverged).toBe(false);
    expect(after?.pendingUpdate).toBeNull();
    expect(after?.baseVersion).toBe(proposed?.templateVersion);

    mockDeleteRoutineInstance(instance.id);
  });

  it('keeps theirs: nothing moves, and it stays behind', () => {
    const instance = assignOne();
    mockProposeUpdate('pg-strength-5x5');
    const before = mockRoutineInstance(instance.id)?.blocks;

    mockDeclineUpdate(instance.id);

    const after = mockRoutineInstance(instance.id);
    expect(after?.blocks).toEqual(before);
    expect(after?.pendingUpdate).toBeNull();
    // Declining is a decision, not a deferral — the copy is knowingly behind.
    expect(after?.diverged).toBe(true);

    mockDeleteRoutineInstance(instance.id);
  });

  it('answers for themselves and nobody else', () => {
    const mine = mockAssignProgram('pg-strength-5x5', ['answer-a'])[0];
    const theirs = mockAssignProgram('pg-strength-5x5', ['answer-b'])[0];
    mockProposeUpdate('pg-strength-5x5');

    mockAcceptUpdate(mine.id);

    expect(mockRoutineInstance(mine.id)?.pendingUpdate).toBeNull();
    expect(mockRoutineInstance(theirs.id)?.pendingUpdate).not.toBeNull();

    mockDeleteRoutineInstance(mine.id);
    mockDeleteRoutineInstance(theirs.id);
  });
});

/** Unassigning takes the copy back — including whatever was changed on it. */
const MOCK_OWNER = 'client-maya';

describe('unassigning', () => {
  it('removes that client’s copies and nobody else’s', () => {
    mockAssignProgram('pg-strength-5x5', ['un-a', 'un-b']);

    mockUnassignProgram('pg-strength-5x5', ['un-a']);

    const holders = mockProgramHolders('pg-strength-5x5');
    expect(holders).not.toContain('un-a');
    expect(holders).toContain('un-b');

    mockUnassignProgram('pg-strength-5x5', ['un-b']);
  });

  it('takes the client’s own changes with it — there is no copy left to hold them', () => {
    const [instance] = mockAssignProgram('pg-strength-5x5', ['un-c']);
    mockSaveRoutineInstance({ ...instance, name: 'My version', diverged: true });

    mockUnassignProgram('pg-strength-5x5', ['un-c']);

    expect(mockRoutineInstance(instance.id)).toBeNull();
  });

  it('leaves the client’s own routines alone', () => {
    // Built here rather than relying on the seeds: an earlier test in this
    // file clears them, and the point being made is about unassign, not order.
    mockSaveRoutineInstance({
      id: 'rou-un-own',
      templateId: null,
      clientId: MOCK_OWNER,
      name: 'Mine',
      note: null,
      blocks: [],
      orderIndex: 0,
      lastCompletedAt: null,
      baseVersion: null,
      diverged: false,
      pendingUpdate: null,
    });
    mockAssignProgram('pg-strength-5x5', [MOCK_OWNER]);

    mockUnassignProgram('pg-strength-5x5', [MOCK_OWNER]);

    expect(mockRoutineInstance('rou-un-own')).not.toBeNull();
    mockDeleteRoutineInstance('rou-un-own');
  });

  it('ignores a client who never held it', () => {
    expect(mockUnassignProgram('pg-strength-5x5', ['never-had-it'])).toBe(0);
  });
});
