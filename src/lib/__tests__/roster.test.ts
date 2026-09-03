import type { ApiRosterClient, ApiRosterLabel } from '@/api/types';
import {
  deriveRosterStats,
  filterRosterClients,
  groupRosterClients,
  nextRosterSort,
  sortRosterClients,
  withLabelCounts,
} from '@/lib/roster';

function client(overrides: Partial<ApiRosterClient>): ApiRosterClient {
  return {
    id: 'rc-x',
    name: 'Test Client',
    initials: 'TC',
    daysAgo: 0,
    when: 'now',
    meta: 'Upper/Lower · wk 1 · workouts',
    attention: 'ok',
    access: 'partial',
    labelId: null,
    ...overrides,
  };
}

const labels: readonly ApiRosterLabel[] = [
  { id: 'prep', name: 'Comp prep', color: 'label-violet', count: 0 },
  { id: 'rehab', name: 'Rehab', color: 'label-amber', count: 0 },
];

describe('roster derivations', () => {
  it('counts labels from the roster rather than trusting the stored count', () => {
    const clients = [
      client({ id: 'a', labelId: 'prep' }),
      client({ id: 'b', labelId: 'prep' }),
      client({ id: 'c', labelId: null }),
    ];

    expect(withLabelCounts(labels, clients).map((label) => label.count)).toEqual([2, 0]);
  });

  it('derives the three KPIs from the attention states', () => {
    const stats = deriveRosterStats([
      client({ id: 'a', attention: 'live' }),
      client({ id: 'b', attention: 'review' }),
      client({ id: 'c', attention: 'review' }),
      client({ id: 'd' }),
    ]);

    expect(stats.map((stat) => stat.value)).toEqual(['4', '2', '1']);
  });
});

describe('filterRosterClients', () => {
  const clients = [
    client({ id: 'a', name: 'Maya Andersson', attention: 'live', labelId: 'prep' }),
    client({ id: 'b', name: 'Amir Haddad', attention: 'review', meta: 'Hypertrophy · wk 7' }),
    client({ id: 'c', name: 'Kai Vogt', attention: 'quiet', labelId: 'rehab' }),
  ];

  it('matches on name and on the program in the meta line', () => {
    const base = { attention: 'all', labelId: null } as const;

    expect(
      filterRosterClients(clients, { ...base, query: 'maya' }).map((entry) => entry.id),
    ).toEqual(['a']);
    expect(
      filterRosterClients(clients, { ...base, query: 'hypertrophy' }).map((entry) => entry.id),
    ).toEqual(['b']);
  });

  it('narrows by attention and by label together', () => {
    expect(
      filterRosterClients(clients, { query: '', attention: 'review', labelId: null }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['b']);

    expect(
      filterRosterClients(clients, { query: '', attention: 'all', labelId: 'rehab' }).map(
        (entry) => entry.id,
      ),
    ).toEqual(['c']);
  });
});

describe('grouping', () => {
  const clients = [
    client({ id: 'today', daysAgo: 0 }),
    client({ id: 'week', daysAgo: 6 }),
    client({ id: 'quiet', daysAgo: 7, labelId: 'rehab' }),
  ];

  it('splits on today / this week / quiet, and drops empty groups', () => {
    const groups = groupRosterClients(clients, 'recent', labels);
    expect(groups.map((group) => group.title)).toEqual(['TODAY', 'THIS WEEK', 'QUIET']);

    const oneDay = groupRosterClients([client({ daysAgo: 3 })], 'recent', labels);
    expect(oneDay.map((group) => group.title)).toEqual(['THIS WEEK']);
  });

  it('files by label instead when the sort says so, unfiled last', () => {
    const groups = groupRosterClients(clients, 'label', labels);
    expect(groups.map((group) => group.title)).toEqual(['REHAB', 'NO LABEL']);
  });
});

describe('sorting', () => {
  it('cycles through every sort and back to the start', () => {
    expect(nextRosterSort('recent')).toBe('az');
    expect(nextRosterSort('az')).toBe('attention');
    expect(nextRosterSort('attention')).toBe('label');
    expect(nextRosterSort('label')).toBe('recent');
  });

  it('puts the rows that want an answer first under Attention', () => {
    const sorted = sortRosterClients(
      [
        client({ id: 'ok', attention: 'ok' }),
        client({ id: 'quiet', attention: 'quiet' }),
        client({ id: 'review', attention: 'review' }),
        client({ id: 'live', attention: 'live' }),
      ],
      'attention',
    );

    expect(sorted.map((entry) => entry.id)).toEqual(['live', 'review', 'ok', 'quiet']);
  });
});
