import type { ApiReviewDomain } from '@/api/types';
import {
  currentLabelName,
  domainBadge,
  isGranted,
  labelPrivacyNote,
  liveBannerText,
  markRequested,
  requestAction,
  sessionTagTone,
  visibleRows,
  checkInRows,
  healthRows,
  metricsRows,
} from '@/lib/clientReview';

function domain(overrides: Partial<ApiReviewDomain> = {}): ApiReviewDomain {
  return {
    id: 'nutrition',
    title: 'Nutrition',
    access: 'granted',
    rows: [{ label: 'Today', value: '1,840 / 2,600 kcal' }],
    note: 'Maya shares nutrition. She can withdraw this at any time.',
    ...overrides,
  };
}

describe('domain access', () => {
  it('shows rows only for a granted domain', () => {
    expect(visibleRows(domain({ access: 'granted' }))).toHaveLength(1);
  });

  /* The refusal this whole screen exists to make. A coach must never read a
     value in a domain the client did not share — not a number, not a dash,
     not a placeholder — so the rows are withheld even when the payload
     wrongly carries them. */
  it('withholds every row from a domain that was not granted', () => {
    expect(visibleRows(domain({ access: 'not-granted' }))).toEqual([]);
    expect(visibleRows(domain({ access: 'requested' }))).toEqual([]);
  });

  it('withholds rows even when the server sends them alongside not-granted', () => {
    const leaky = domain({
      access: 'not-granted',
      rows: [
        { label: 'Body weight', value: '82.4 kg' },
        { label: 'Waist', value: '78 cm' },
      ],
    });

    expect(visibleRows(leaky)).toEqual([]);
  });

  it('never treats a request as access', () => {
    expect(isGranted('requested')).toBe(false);
    expect(domainBadge('requested')).toEqual({ label: 'Not shared', tone: 'neutral' });
  });

  it('badges a granted domain as shared', () => {
    expect(domainBadge('granted')).toEqual({ label: 'Shared', tone: 'violet' });
  });

});

describe('requesting access', () => {
  it('offers the ask once, then goes flat', () => {
    expect(requestAction('not-granted')).toEqual({ title: 'Request access', disabled: false });
    expect(requestAction('requested')).toEqual({ title: 'Requested', disabled: true });
  });

  it('offers nothing on a domain that is already shared', () => {
    expect(requestAction('granted')).toBeNull();
  });

  it('marks the asked domain and leaves the others alone', () => {
    const domains = [
      domain({ id: 'health', access: 'not-granted', rows: [] }),
      domain({ id: 'monthly', access: 'not-granted', rows: [] }),
    ];

    const next = markRequested(domains, 'health');

    expect(next[0].access).toBe('requested');
    expect(next[1].access).toBe('not-granted');
  });

  /* Asking is a note about the coach's behaviour, never a change to what
     they can see — so a granted domain cannot be walked backwards by it. */
  it('cannot turn a granted domain into a requested one', () => {
    const next = markRequested([domain({ access: 'granted' })], 'nutrition');
    expect(next[0].access).toBe('granted');
    expect(visibleRows(next[0])).toHaveLength(1);
  });
});

describe('review copy', () => {
  it('states the live fact without inviting an action', () => {
    expect(liveBannerText('Maya Andersson')).toBe('Maya Andersson is training now');
  });

  it('says in the client’s own name that a label tells them nothing', () => {
    expect(labelPrivacyNote('Maya')).toBe(
      'Labels organise your own roster. Maya cannot see this, and it changes nothing about their permissions.',
    );
  });

  it('does not assume a client’s gender — the line renders for the whole roster', () => {
    expect(labelPrivacyNote('Marek')).toContain('their permissions');
    expect(labelPrivacyNote('Marek')).not.toMatch(/\b(her|his)\b/);
  });
});

describe('session tags', () => {
  it('tones a tag by what it means, not by where it sits', () => {
    expect(sessionTagTone('Done')).toBe('success');
    expect(sessionTagTone('Today')).toBe('violet');
    expect(sessionTagTone('Missed')).toBe('danger');
    expect(sessionTagTone('Planned')).toBe('neutral');
  });
});

describe('current label', () => {
  const labels = [
    { id: 'prep', name: 'Comp prep' },
    { id: 'rehab', name: 'Rehab' },
  ];

  it('names the label the client is filed under', () => {
    expect(currentLabelName('prep', labels)).toBe('Comp prep');
  });

  it('says None rather than inventing one for an unfiled client', () => {
    expect(currentLabelName(null, labels)).toBe('None');
  });

  it('says None for a label that no longer exists', () => {
    expect(currentLabelName('deleted', labels)).toBe('None');
  });
});

/**
 * A card that says "Shared" and shows nothing is the permission without the
 * point of it. These are what the coach actually reads.
 */
describe('metricsRows', () => {
  const reading = (measured_at: string, weight_kg: number | null, waist_cm = 78) => ({
    measured_at,
    weight_kg,
    waist_cm,
    body_fat_pct: 16.8,
  });

  it('leads with the latest reading and how it has moved', () => {
    const rows = metricsRows([
      reading('2026-09-01T00:00:00Z', 82.4),
      reading('2026-06-01T00:00:00Z', 84.2),
    ]);

    expect(rows[0]).toEqual({ label: 'Body weight', value: '82.4 kg' });
    expect(rows.at(-1)).toEqual({ label: 'Trend', value: '−1.8 kg since Jun' });
  });

  it('offers no trend from a single reading', () => {
    const rows = metricsRows([reading('2026-09-01T00:00:00Z', 82.4)]);
    expect(rows.some((row) => row.label === 'Trend')).toBe(false);
  });

  it('says plainly when nothing has been logged', () => {
    expect(metricsRows([])).toEqual([{ label: 'Nothing logged', value: '—' }]);
  });
});

describe('healthRows', () => {
  it('puts injuries first — they are what changes a program', () => {
    const rows = healthRows([
      { section: 'medication', label: 'Salbutamol', value: 'As needed' },
      { section: 'injuries', label: 'Left shoulder', value: 'Impingement' },
      { section: 'conditions', label: 'Asthma', value: 'Exercise-induced' },
    ]);

    expect(rows.map((row) => row.label)).toEqual([
      'Left shoulder',
      'Asthma',
      'Salbutamol',
    ]);
  });

  it('is a card, not the whole file', () => {
    const many = Array.from({ length: 9 }, (_unused, index) => ({
      section: 'injuries',
      label: `Injury ${index}`,
      value: 'x',
    }));
    expect(healthRows(many)).toHaveLength(5);
  });

  it('says plainly when nothing is recorded', () => {
    expect(healthRows([])).toEqual([{ label: 'Nothing recorded', value: '—' }]);
  });
});

describe('checkInRows', () => {
  it('shows the latest month with its change, and their own words', () => {
    expect(
      checkInRows([
        { label: 'August 2026', weightKg: '82.4', delta: '−0.7', note: 'Waist down.' },
      ]),
    ).toEqual([
      { label: 'August 2026', value: '82.4 kg (−0.7)' },
      { label: 'Note', value: 'Waist down.' },
    ]);
  });

  it('leaves the delta off when there is no month to compare with', () => {
    expect(
      checkInRows([{ label: 'August 2026', weightKg: '82.4', delta: '—', note: '' }]),
    ).toEqual([{ label: 'August 2026', value: '82.4 kg' }]);
  });
});
