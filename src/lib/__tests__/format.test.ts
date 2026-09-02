import { formatPercent, formatSessionDay, formatWeight, initials } from '@/lib/format';

describe('formatWeight', () => {
  it('rounds and suffixes kilograms', () => {
    expect(formatWeight(82.4)).toBe('82kg');
  });

  it('converts to pounds when the coach prefers lb', () => {
    expect(formatWeight(100, 'lb')).toBe('220lb');
  });
});

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
