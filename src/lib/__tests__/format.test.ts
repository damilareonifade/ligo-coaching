import {
  formatChatStamp,
  formatPercent,
  formatSessionDay,
  formatTime,
  initials,
  relativeTime,
} from '@/lib/format';

describe('formatSessionDay', () => {
  const now = new Date('2026-03-04T09:00:00.000Z');

  it('labels the current day', () => {
    expect(formatSessionDay('2026-03-04T17:00:00.000Z', now)).toBe('Today');
  });

  it('labels the next and previous day', () => {
    expect(formatSessionDay('2026-03-05T06:30:00.000Z', now)).toBe('Tomorrow');
    expect(formatSessionDay('2026-03-03T06:30:00.000Z', now)).toBe('Yesterday');
  });

  it('falls back to a weekday date further out', () => {
    expect(formatSessionDay('2026-03-11T06:30:00.000Z', now)).toContain('Mar');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two names', () => {
    expect(initials('Ada Bello')).toBe('AB');
    expect(initials('chiamaka nwosu okoro')).toBe('CN');
    expect(initials('Tunde')).toBe('T');
  });
});

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(84.6)).toBe('85%');
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-09-10T12:00:00.000Z');

  it('reads "just now" inside the first minute, and for a slightly skewed clock', () => {
    expect(relativeTime('2026-09-10T11:59:30.000Z', now)).toBe('just now');
    expect(relativeTime('2026-09-10T12:00:03.000Z', now)).toBe('just now');
  });

  it('counts minutes, hours and days, singular where it should be', () => {
    expect(relativeTime('2026-09-10T11:59:00.000Z', now)).toBe('1 minute ago');
    expect(relativeTime('2026-09-10T11:30:00.000Z', now)).toBe('30 minutes ago');
    expect(relativeTime('2026-09-10T11:00:00.000Z', now)).toBe('1 hour ago');
    expect(relativeTime('2026-09-09T12:00:00.000Z', now)).toBe('1 day ago');
    expect(relativeTime('2026-09-05T12:00:00.000Z', now)).toBe('5 days ago');
  });

  it('falls back to a date past a month', () => {
    expect(relativeTime('2026-06-01T12:00:00.000Z', now)).toMatch(/2026/);
  });

  it('does not throw on a value that is not a date', () => {
    expect(relativeTime('not-a-date', now)).toBe('unknown');
  });
});

describe('formatChatStamp', () => {
  const now = new Date('2026-03-12T15:00:00Z');

  it('gives the clock for today, where the day is noise', () => {
    expect(formatChatStamp('2026-03-12T09:12:00Z', now)).toBe(formatTime('2026-03-12T09:12:00Z'));
  });

  it('adds the weekday within the week, where the day is the question', () => {
    const stamp = formatChatStamp('2026-03-09T09:12:00Z', now);
    expect(stamp).toContain(formatTime('2026-03-09T09:12:00Z'));
    expect(stamp.split(' ')[0]).toHaveLength(3);
  });

  it('drops to a date once a weekday is ambiguous', () => {
    // Seven days back is the same weekday as today: "Thu" would read as
    // today to anyone scrolling quickly.
    expect(formatChatStamp('2026-03-05T09:12:00Z', now)).not.toContain(':');
  });

  it('says nothing rather than "Invalid Date"', () => {
    expect(formatChatStamp('not a date', now)).toBe('');
  });
});
