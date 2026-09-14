import {
  displayLength,
  displayWeight,
  formatLength,
  formatSetWeight,
  formatVolume,
  formatWeight,
  storedLength,
  storedWeight,
  unitsSummary,
  weightStep,
} from '@/lib/units';

describe('weight', () => {
  it('leaves kilograms alone', () => {
    expect(displayWeight(82.4, 'kg')).toBe(82.4);
    expect(storedWeight(82.4, 'kg')).toBe(82.4);
  });

  it('converts to pounds and back', () => {
    expect(formatWeight(100, 'lb')).toBe('220.5 lb');
    expect(formatWeight(100, 'kg')).toBe('100 kg');
  });

  /**
   * The one that corrupts data if it is wrong: whatever a person types has to
   * come back as the kilograms that were stored, or every set they log drifts.
   */
  it('round-trips without drifting', () => {
    for (const kg of [0, 2.5, 60, 82.4, 102.06, 300]) {
      const shown = displayWeight(kg, 'lb');
      expect(storedWeight(shown, 'lb')).toBeCloseTo(kg, 6);
    }
  });

  it('rounds display to one decimal, because a scale has no more', () => {
    // 84 kg is 185.18808 lb, and a card reading that claims a precision the
    // scale never had.
    expect(formatWeight(84, 'lb')).toBe('185.2 lb');
  });

  it('steps by whole plates in each unit', () => {
    expect(weightStep('kg')).toBe(2.5);
    // Not 2.5 kg converted — 5.51 lb is not a number anyone loads on a bar.
    expect(weightStep('lb')).toBe(5);
  });

  it('drops a trailing zero on set chips', () => {
    expect(formatSetWeight(60, 'kg')).toBe('60');
    expect(formatSetWeight(62.5, 'kg')).toBe('62.5');
  });

  it('rounds volume, where a decimal is noise', () => {
    expect(formatVolume(4320, 'kg')).toBe('4,320 kg');
    expect(formatVolume(4320, 'lb')).toBe('9,524 lb');
  });
});

describe('length', () => {
  it('converts to inches and back', () => {
    expect(formatLength(84, 'cm')).toBe('84 cm');
    expect(formatLength(84, 'in')).toBe('33.1 in');
  });

  it('round-trips without drifting', () => {
    for (const cm of [20, 84, 101.6, 300]) {
      expect(storedLength(displayLength(cm, 'in'), 'in')).toBeCloseTo(cm, 6);
    }
  });
});

describe('unitsSummary', () => {
  it('reads as the value on the settings row', () => {
    expect(unitsSummary('kg', 'cm')).toBe('kg · cm');
    // The two are chosen separately — pounds with centimetres is allowed.
    expect(unitsSummary('lb', 'cm')).toBe('lb · cm');
  });
});
