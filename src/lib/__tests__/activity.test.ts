import type { ActivityKind, ApiActivityGroup, ApiActivityItem } from '@/api/types';
import {
  isAccessChange,
  isAccessLoss,
  markActivityRead,
  unreadActivityCount,
} from '@/lib/activity';

function item(overrides: Partial<ApiActivityItem>): ApiActivityItem {
  return {
    id: 'act-x',
    kind: 'session-done',
    clientId: 'rc-x',
    clientName: 'Test Client',
    initials: 'TC',
    title: 'Test finished Upper A',
    body: '7 of 7 sets',
    when: '2h',
    unread: false,
    ...overrides,
  };
}

const groups: readonly ApiActivityGroup[] = [
  {
    id: 'today',
    title: 'TODAY',
    items: [item({ id: 'a', unread: true }), item({ id: 'b', unread: true })],
  },
  { id: 'earlier', title: 'EARLIER THIS WEEK', items: [item({ id: 'c' })] },
];

describe('access classification', () => {
  it('treats attaching and detaching as access changes, not just the explicit grants', () => {
    const access: readonly ActivityKind[] = [
      'permission-granted',
      'permission-revoked',
      'attached',
      'detached',
    ];

    expect(access.every(isAccessChange)).toBe(true);
  });

  it('leaves training and messages out of the access treatment', () => {
    const other: readonly ActivityKind[] = [
      'session-done',
      'session-missed',
      'message',
      'check-in',
    ];

    expect(other.some(isAccessChange)).toBe(false);
  });

  it('separates a boundary closing from a boundary opening', () => {
    expect(isAccessLoss('permission-revoked')).toBe(true);
    expect(isAccessLoss('detached')).toBe(true);
    expect(isAccessLoss('permission-granted')).toBe(false);
    expect(isAccessLoss('attached')).toBe(false);
    // A missed session is bad news, but it is not a permission moving.
    expect(isAccessLoss('session-missed')).toBe(false);
  });
});

describe('markActivityRead', () => {
  it('marks only the item named, wherever in the feed it sits', () => {
    const next = markActivityRead(groups, 'b');

    expect(next[0].items.map((entry) => entry.unread)).toEqual([true, false]);
    expect(next[1].items[0].unread).toBe(false);
  });

  it('keeps the grouping and the ordering intact', () => {
    const next = markActivityRead(groups, 'a');

    expect(next.map((group) => group.id)).toEqual(['today', 'earlier']);
    expect(next[0].items.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('does not mutate what it was handed — the rollback needs the original', () => {
    markActivityRead(groups, 'a');

    expect(groups[0].items[0].unread).toBe(true);
  });

  it('is a no-op for an id that is not in the feed', () => {
    expect(unreadActivityCount(markActivityRead(groups, 'missing'))).toBe(2);
  });
});

describe('unreadActivityCount', () => {
  it('counts across every group', () => {
    expect(unreadActivityCount(groups)).toBe(2);
  });

  it('is zero for an empty feed', () => {
    expect(unreadActivityCount([])).toBe(0);
  });
});
