import { SHARE_DOMAINS } from '@/api/types';
import type { ApiSharePermissions, ShareDomain , ApiRosterClient, ApiRosterLabel } from '@/api/types';
import {
  attentionCounts,
  filterRosterClients,
  groupRosterClients,
  nextRosterSort,
  sortRosterClients,
  withLabelCounts,
  deriveAccess,
  deriveAttention,
  rosterMeta,
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

  it('counts every filter, including the ones nobody is in', () => {
    // These ride on the filter chips now. A count that is missing is a chip
    // the roster quietly stops offering, so all five are asserted.
    expect(
      attentionCounts([
        client({ id: 'a', attention: 'live' }),
        client({ id: 'b', attention: 'review' }),
        client({ id: 'c', attention: 'review' }),
        client({ id: 'd' }),
      ]),
    ).toEqual({ all: 4, review: 2, live: 1, new: 0, quiet: 0 });
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

/**
 * These two used to be typed into fixtures by hand, so there was no rule to
 * disagree with. Now there is one, and "Needs a look" has to mean the same
 * thing on every row.
 */
describe('deriveAttention', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

  it('puts training now above everything else', () => {
    expect(
      deriveAttention(
        { isTraining: true, lastWorkoutAt: daysAgo(90), acceptedAt: daysAgo(90) },
        now,
      ),
    ).toBe('live');
  });

  it('calls a recent session one worth looking at', () => {
    expect(
      deriveAttention({ isTraining: false, lastWorkoutAt: hoursAgo(6), acceptedAt: null }, now),
    ).toBe('review');
  });

  it('stops calling it that once it is old news', () => {
    expect(
      deriveAttention({ isTraining: false, lastWorkoutAt: daysAgo(4), acceptedAt: null }, now),
    ).toBe('ok');
  });

  it('notices a long silence', () => {
    expect(
      deriveAttention({ isTraining: false, lastWorkoutAt: daysAgo(30), acceptedAt: null }, now),
    ).toBe('quiet');
  });

  it('separates someone brand new from someone who went quiet', () => {
    expect(
      deriveAttention({ isTraining: false, lastWorkoutAt: null, acceptedAt: daysAgo(2) }, now),
    ).toBe('new');
    expect(
      deriveAttention({ isTraining: false, lastWorkoutAt: null, acceptedAt: daysAgo(60) }, now),
    ).toBe('quiet');
  });
});

describe('deriveAccess', () => {
  const perms = (...on: readonly ShareDomain[]) =>
    Object.fromEntries(
      SHARE_DOMAINS.map((domain) => [domain, on.includes(domain)]),
    ) as ApiSharePermissions;

  it('says messaging only when nothing is shared', () => {
    expect(deriveAccess(perms())).toBe('none');
  });

  it('distinguishes one domain from several', () => {
    expect(deriveAccess(perms('metrics'))).toBe('min');
    expect(deriveAccess(perms('metrics', 'nutrition'))).toBe('partial');
  });

  it('only says full when it means all of it', () => {
    expect(deriveAccess(perms(...SHARE_DOMAINS))).toBe('full');
    expect(deriveAccess(perms(...SHARE_DOMAINS.slice(0, -1)))).toBe('partial');
  });
});

describe('rosterMeta', () => {
  it('names the program and what they share', () => {
    const shared = { workouts: true, nutrition: true } as ApiSharePermissions;
    expect(rosterMeta('Upper/Lower', shared)).toBe('Upper/Lower · workouts, nutrition');
  });

  it('says so plainly when there is neither', () => {
    expect(rosterMeta(null, {} as ApiSharePermissions)).toBe('No program yet · nothing shared');
  });
});
