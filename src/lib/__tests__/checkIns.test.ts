import {
  checkInFromRow,
  checkInShareNote,
  checkInStats,
  formatDelta,
  measurementCell,
  monthLabel,
  type CheckInRow,
} from '@/lib/checkIns';

function row(partial: Partial<CheckInRow>): CheckInRow {
  return {
    id: 'r1',
    month_start: '2026-08-01T00:00:00Z',
    measured_at: '2026-08-03T09:00:00Z',
    weight_kg: 82.4,
    waist_cm: 78,
    chest_cm: 104,
    hips_cm: 96,
    body_fat_pct: 16.8,
    note: 'Waist down again.',
    logged_by_client: true,
    ...partial,
  };
}

describe('formatDelta', () => {
  it('signs the change, and uses a minus rather than a hyphen', () => {
    // U+2212. A hyphen reads as punctuation next to a number.
    expect(formatDelta(82.4, 83.1)).toBe('−0.7');
    expect(formatDelta(83.1, 82.4)).toBe('+0.7');
    expect(formatDelta(82.4, 82.4)).toBe('0.0');
  });

  it('says nothing rather than zero when there is no month below', () => {
    expect(formatDelta(82.4, null)).toBe('—');
    expect(formatDelta(null, 82.4)).toBe('—');
  });
});

describe('measurementCell', () => {
  it('shows a dash for a measurement nobody took', () => {
    expect(measurementCell('Waist', null, ' cm')).toEqual({ label: 'Waist', value: '—' });
    expect(measurementCell('Waist', '', ' cm')).toEqual({ label: 'Waist', value: '—' });
  });

  it('is not fooled into calling a blank field zero', () => {
    expect(measurementCell('Waist', '  ', ' cm').value).toBe('—');
    expect(measurementCell('Waist', 0, ' cm').value).toBe('0 cm');
  });
});

describe('checkInFromRow', () => {
  it('reads a measurement row as the month it belongs to', () => {
    const entry = checkInFromRow(row({}), row({ weight_kg: 83.1 }));

    expect(entry.label).toBe('August 2026');
    expect(entry.weightKg).toBe('82.4');
    expect(entry.delta).toBe('−0.7');
    expect(entry.cells.map((c) => c.value)).toEqual(['78 cm', '104 cm', '96 cm', '16.8%']);
  });

  it('says who wrote it, because the client did not write all of them', () => {
    expect(checkInFromRow(row({}), null).by).toBe('you');
    expect(checkInFromRow(row({ logged_by_client: false }), null).by).toBe('coach');
    expect(checkInFromRow(row({ logged_by_client: false }), null).byLine).toContain(
      'your coach',
    );
  });

  it('reports no photos, because nothing stores one yet', () => {
    expect(checkInFromRow(row({}), null).photos).toBe(0);
  });
});

describe('checkInStats', () => {
  it('counts what is logged and the change across it', () => {
    const entries = [
      checkInFromRow(row({ id: 'a', weight_kg: 82.4 }), row({ weight_kg: 83.1 })),
      checkInFromRow(
        row({ id: 'b', month_start: '2026-06-01T00:00:00Z', weight_kg: 84.2 }),
        null,
      ),
    ];

    expect(checkInStats(entries)).toEqual([
      { label: 'Latest weight', value: '82.4 kg' },
      { label: 'Since June', value: '−1.8 kg' },
      { label: 'Logged', value: '2' },
    ]);
  });

  it('has nothing to compare with a single month', () => {
    const entries = [checkInFromRow(row({}), null)];
    expect(checkInStats(entries)[1].value).toBe('—');
  });
});

/**
 * Seeing and logging are two permissions. The copy used to describe one switch
 * doing both, which would have been a promise the model does not make.
 */
describe('checkInShareNote', () => {
  it('distinguishes seeing from logging on your behalf', () => {
    expect(checkInShareNote('Sam Okafor', true, false)).toContain('separate permission');
    expect(checkInShareNote('Sam Okafor', true, true)).toContain('can log one for you');
  });

  it('promises what the database does — hidden, never deleted', () => {
    expect(checkInShareNote('Sam Okafor', true, true)).toContain('nothing is deleted');
  });

  it('does not name a coach who is not there', () => {
    expect(checkInShareNote(null, false, false)).toContain('No coach attached');
  });
});

describe('monthLabel', () => {
  it('names the month a row belongs to', () => {
    expect(monthLabel('2026-08-01T00:00:00Z')).toBe('August 2026');
  });
});
