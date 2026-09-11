import type { ApiExerciseOption, ApiProgramBlock, ApiProgramDay } from '@/api/types';
import {
  assignedLabel,
  buildDayLabels,
  filterExerciseOptions,
  groupExerciseOptions,
  parseSetCount,
  resizeDays,
  resultCountLabel,
  setsLabel,
  statusTone,
  totalSets,
} from '@/lib/programs';

function block(overrides: Partial<ApiProgramBlock>): ApiProgramBlock {
  return { id: 'blk-x', name: 'Bench press', scheme: '4 × 8', rpe: 'RPE 8', note: null, ...overrides };
}

function option(overrides: Partial<ApiExerciseOption>): ApiExerciseOption {
  return {
    id: 'ex-x',
    name: 'Bench press',
    meta: 'Barbell · Chest',
    tag: 'Compound',
    group: 'Chest',
    ...overrides,
  };
}

describe('set maths', () => {
  it('reads the set count off the scheme the coach typed', () => {
    expect(parseSetCount('4 × 8')).toBe(4);
    expect(parseSetCount('3 × 10')).toBe(3);
    expect(parseSetCount('12 × 3')).toBe(12);
  });

  it('counts an unparseable scheme as no sets rather than NaN', () => {
    expect(parseSetCount('')).toBe(0);
    expect(parseSetCount('AMRAP')).toBe(0);
    expect(parseSetCount('× 8')).toBe(0);
  });

  it('totals a day from its blocks', () => {
    const blocks = [
      block({ scheme: '4 × 8' }),
      block({ scheme: '3 × 10' }),
      block({ scheme: '4 × 8' }),
      block({ scheme: '3 × 12' }),
    ];

    expect(totalSets(blocks)).toBe(14);
    expect(setsLabel(blocks)).toBe('14 sets');
  });

  it('says an empty day is empty instead of showing a zero', () => {
    expect(setsLabel([])).toBe('No sets yet');
    expect(setsLabel([block({ scheme: '1 × 5' })])).toBe('1 set');
  });
});

describe('assignment and status', () => {
  it('calls nobody-holds-it unassigned, and singular one client', () => {
    expect(assignedLabel(0)).toBe('Not assigned');
    expect(assignedLabel(1)).toBe('Assigned to 1 client');
    expect(assignedLabel(4)).toBe('Assigned to 4 clients');
  });

  it('tones the status badge without shouting about an archive', () => {
    expect(statusTone('published')).toBe('violet');
    expect(statusTone('draft')).toBe('warning');
    expect(statusTone('archived')).toBe('neutral');
  });
});

describe('builder day shapes', () => {
  it('labels days from one', () => {
    expect(buildDayLabels(3)).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(buildDayLabels(0)).toEqual([]);
  });

  it('keeps the blocks already entered when the day count changes', () => {
    const days: readonly ApiProgramDay[] = [
      { id: 'day-1', label: 'Day 1', blocks: [block({})] },
      { id: 'day-2', label: 'Day 2', blocks: [block({}), block({})] },
    ];

    const grown = resizeDays(days, 4);
    expect(grown).toHaveLength(4);
    expect(grown[1].blocks).toHaveLength(2);
    expect(grown[3].blocks).toHaveLength(0);

    const shrunk = resizeDays(grown, 2);
    expect(shrunk).toHaveLength(2);
    expect(shrunk[1].blocks).toHaveLength(2);
  });
});

describe('exercise picker', () => {
  const options = [
    option({ id: 'a', name: 'Bench press', group: 'Recent', tag: 'Compound' }),
    option({ id: 'b', name: "Sam's split squat", meta: 'Dumbbell · Quads', group: 'Recent', tag: 'Yours' }),
    option({ id: 'c', name: 'Cable fly', meta: 'Cable · Chest', group: 'Chest', tag: 'Accessory' }),
    option({ id: 'd', name: 'Back squat', meta: 'Barbell · Quads', group: 'Legs', tag: 'Compound' }),
  ];

  it('filters by tag', () => {
    expect(filterExerciseOptions(options, '', 'compound').map((item) => item.id)).toEqual(['a', 'd']);
    expect(filterExerciseOptions(options, '', 'yours').map((item) => item.id)).toEqual(['b']);
  });

  it('treats Recent as a section, not a tag', () => {
    expect(filterExerciseOptions(options, '', 'recent').map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('searches the equipment and muscle line as well as the name', () => {
    expect(filterExerciseOptions(options, 'cable', 'all').map((item) => item.id)).toEqual(['c']);
    expect(filterExerciseOptions(options, 'quads', 'all').map((item) => item.id)).toEqual(['b', 'd']);
  });

  it('combines the query with the filter', () => {
    expect(filterExerciseOptions(options, 'squat', 'compound').map((item) => item.id)).toEqual(['d']);
  });

  it('returns everything for an empty query on All', () => {
    expect(filterExerciseOptions(options, '   ', 'all')).toHaveLength(4);
  });

  it('groups in first-seen order so Recent stays on top', () => {
    const groups = groupExerciseOptions(options);
    expect(groups.map((group) => group.title)).toEqual(['RECENT', 'CHEST', 'LEGS']);
    expect(groups[0].options.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('counts results in words', () => {
    expect(resultCountLabel(0)).toBe('0 exercises');
    expect(resultCountLabel(1)).toBe('1 exercise');
    expect(resultCountLabel(15)).toBe('15 exercises');
  });
});
