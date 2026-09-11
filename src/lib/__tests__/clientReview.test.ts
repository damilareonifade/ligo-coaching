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
