import type { ApiCoachNotification } from '@/api/types';
import {
  COACH_EXPORT_NOTE,
  NOTIFICATION_LOCK_NOTE,
  canToggleNotification,
  coachHeadline,
  toggleNotification,
} from '@/lib/coachProfile';

function row(overrides: Partial<ApiCoachNotification> = {}): ApiCoachNotification {
  return {
    id: 'session-completed',
    label: 'Session completed',
    desc: 'When a client finishes a workout',
    enabled: true,
    locked: false,
    ...overrides,
  };
}

const rows: readonly ApiCoachNotification[] = [
  row(),
  row({ id: 'new-message', label: 'New message' }),
  row({ id: 'permission-changed', label: 'Permission changed', locked: true }),
];

describe('coach headline', () => {
  it('derives the client count rather than carrying an authored one', () => {
    expect(coachHeadline('Strength coach · Berlin', 17)).toBe(
      'Strength coach · Berlin · 17 clients',
    );
  });

  it('does not pluralise a single client', () => {
    expect(coachHeadline('Strength coach · Berlin', 1)).toBe(
      'Strength coach · Berlin · 1 client',
    );
  });

  it('handles a coach with nobody yet', () => {
    expect(coachHeadline('Strength coach · Berlin', 0)).toBe(
      'Strength coach · Berlin · 0 clients',
    );
  });
});

describe('notification toggles', () => {
  it('turns an unlocked row off', () => {
    const next = toggleNotification(rows, 'new-message', false);
    expect(next.find((entry) => entry.id === 'new-message')?.enabled).toBe(false);
  });

  it('leaves the other rows untouched', () => {
    const next = toggleNotification(rows, 'new-message', false);
    expect(next.find((entry) => entry.id === 'session-completed')?.enabled).toBe(true);
  });

  /* The second refusal. A coach who could mute permission changes could go on
     coaching against access a client took back this morning — so the locked
     row is refused by the shared predicate, which the mutation and the mock
     both call, not only by a disabled switch. */
  it('refuses to turn the locked row off', () => {
    const next = toggleNotification(rows, 'permission-changed', false);
    expect(next.find((entry) => entry.id === 'permission-changed')?.enabled).toBe(true);
  });

  it('refuses the locked row even when the write claims to enable it', () => {
    const off = [row({ id: 'permission-changed', locked: true, enabled: false })];
    expect(toggleNotification(off, 'permission-changed', true)[0].enabled).toBe(false);
  });

  it('says which rows may move at all', () => {
    expect(canToggleNotification(row())).toBe(true);
    expect(canToggleNotification(row({ locked: true }))).toBe(false);
  });

  it('returns the list unchanged for an id that is not there', () => {
    expect(toggleNotification(rows, 'nope', false)).toEqual(rows);
  });
});

describe('settings copy', () => {
  it('explains the lock in terms of what the coach may do', () => {
    expect(NOTIFICATION_LOCK_NOTE).toBe(
      'Permission changes cannot be muted they change what you are allowed to do.',
    );
  });

  it('draws the line between the coach’s work and the client’s logs', () => {
    expect(COACH_EXPORT_NOTE).toBe(
      'Your export contains your programs and notes. Client logs belong to clients and leave with them.',
    );
  });
});
