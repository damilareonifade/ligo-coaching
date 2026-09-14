import type { ApiNotification, ApiNotificationGroup, NotificationKind } from '@/api/types';
import {
  hasUnread,
  isAccessChange,
  isAccessLoss,
  markNotificationRead,
  parseDestination,
  unreadCount,
} from '@/lib/notifications';

function item(overrides: Partial<ApiNotification>): ApiNotification {
  return {
    id: 'x',
    kind: 'session-done',
    title: 'A thing happened',
    body: 'Details',
    when: '2h',
    unread: false,
    person: null,
    destination: null,
    ...overrides,
  };
}

const groups: readonly ApiNotificationGroup[] = [
  {
    id: 'today',
    title: 'TODAY',
    items: [item({ id: 'a', unread: true }), item({ id: 'b', unread: true })],
  },
  { id: 'earlier', title: 'EARLIER THIS WEEK', items: [item({ id: 'c' })] },
];

describe('isAccessChange', () => {
  it('covers every kind that moves a boundary', () => {
    const access: readonly NotificationKind[] = [
      'access-requested',
      'access-granted',
      'access-revoked',
      'access-declined',
      'attached',
      'detached',
    ];

    for (const kind of access) expect(isAccessChange(kind)).toBe(true);
  });

  it('leaves training and talking alone', () => {
    const other: readonly NotificationKind[] = [
      'session-done',
      'routine-assigned',
      'routine-updated',
      'check-in',
      'check-in-reply',
      'message',
    ];

    for (const kind of other) expect(isAccessChange(kind)).toBe(false);
  });
});

describe('isAccessLoss', () => {
  it('separates a revoke from a grant', () => {
    expect(isAccessLoss('access-revoked')).toBe(true);
    expect(isAccessLoss('detached')).toBe(true);
    expect(isAccessLoss('access-granted')).toBe(false);
    expect(isAccessLoss('attached')).toBe(false);
    // Being asked is not a loss — nothing has moved yet. Nor is being told
    // no: a coach who was never given something has not lost it.
    expect(isAccessLoss('access-requested')).toBe(false);
    expect(isAccessLoss('access-declined')).toBe(false);
  });
});

describe('markNotificationRead', () => {
  it('clears the one row', () => {
    expect(unreadCount(markNotificationRead(groups, 'a'))).toBe(1);
  });

  it('returns untouched groups by reference', () => {
    // So FlashList does not re-render rows nothing happened to.
    expect(markNotificationRead(groups, 'a')[1]).toBe(groups[1]);
  });

  it('does not mutate what it was given', () => {
    markNotificationRead(groups, 'a');
    expect(groups[0].items[0].unread).toBe(true);
  });

  it('is a no-op for an id that is not there', () => {
    expect(unreadCount(markNotificationRead(groups, 'missing'))).toBe(2);
  });
});

describe('hasUnread', () => {
  it('drives the dot on the bell', () => {
    expect(hasUnread(groups)).toBe(true);
    expect(hasUnread([])).toBe(false);
  });

  it('is false once the last one is read', () => {
    const read = markNotificationRead(markNotificationRead(groups, 'a'), 'b');
    expect(hasUnread(read)).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Destinations arrive as JSON composed by the server, so every one of
 * these is about not trusting them.
 * ------------------------------------------------------------------ */

describe('parseDestination', () => {
  it('takes an in-app path', () => {
    expect(parseDestination({ kind: 'screen', route: '/student/rc-maya' })).toEqual({
      kind: 'screen',
      route: '/student/rc-maya',
    });
  });

  it('takes a path with a query, which is how a picker is opened', () => {
    expect(parseDestination({ kind: 'screen', route: '/check-ins?clientId=rc-lena' })).toEqual({
      kind: 'screen',
      route: '/check-ins?clientId=rc-lena',
    });
  });

  it('refuses anything that is not a path', () => {
    expect(parseDestination({ kind: 'screen', route: 'student/rc-maya' })).toBeNull();
    expect(parseDestination({ kind: 'screen', route: '//evil.example.com' })).toBeNull();
    expect(parseDestination({ kind: 'screen', route: 'https://evil.example.com' })).toBeNull();
    expect(parseDestination({ kind: 'screen', route: '/../../etc/passwd' })).toBeNull();
    expect(parseDestination({ kind: 'screen', route: '' })).toBeNull();
  });

  it('takes an https link, in-app or out', () => {
    expect(parseDestination({ kind: 'web', url: 'https://ligo.app/help' })).toEqual({
      kind: 'web',
      url: 'https://ligo.app/help',
    });
    expect(parseDestination({ kind: 'external', url: 'https://cal.ligo.app/e/1' })).toEqual({
      kind: 'external',
      url: 'https://cal.ligo.app/e/1',
    });
  });

  // The whole reason the check exists: either of these reaching openURL or an
  // in-app browser is arbitrary code from whoever wrote the row.
  it('refuses a scheme that is not https', () => {
    expect(parseDestination({ kind: 'external', url: 'javascript:alert(1)' })).toBeNull();
    expect(parseDestination({ kind: 'web', url: 'data:text/html,<script>x()</script>' })).toBeNull();
    expect(parseDestination({ kind: 'external', url: 'file:///etc/passwd' })).toBeNull();
    expect(parseDestination({ kind: 'web', url: 'http://ligo.app/help' })).toBeNull();
    expect(parseDestination({ kind: 'web', url: 'not a url' })).toBeNull();
  });

  it('refuses a shape it does not recognise', () => {
    expect(parseDestination(null)).toBeNull();
    expect(parseDestination('/train')).toBeNull();
    expect(parseDestination({ kind: 'deeplink', url: 'https://ligo.app' })).toBeNull();
    expect(parseDestination({ kind: 'screen' })).toBeNull();
    expect(parseDestination({ kind: 'web', url: 42 })).toBeNull();
  });
});
