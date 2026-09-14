import { buildCoachSettingsGroups, coachSettingsHeadline } from '@/lib/coachSettings';

describe('coachSettingsHeadline', () => {
  it('leads with the first specialty', () => {
    expect(coachSettingsHeadline(['Strength', 'Mobility'], 'Ironworks Lagos', 17)).toBe(
      'Strength coach · Ironworks Lagos · 17 clients',
    );
  });

  it('drops the gym rather than leaving a gap for it', () => {
    expect(coachSettingsHeadline(['Hypertrophy'], '   ', 4)).toBe('Hypertrophy coach · 4 clients');
  });

  it('falls back to "Coach" when no specialty is set', () => {
    expect(coachSettingsHeadline([], 'PureGym', 1)).toBe('Coach · PureGym · 1 client');
  });

  it('reads a first day as a to-do, not a zero', () => {
    expect(coachSettingsHeadline([], '', 0)).toBe('Coach · no clients yet');
  });
});

describe('buildCoachSettingsGroups', () => {
  const groups = buildCoachSettingsGroups({ inviteCode: 'SAM-4KQ2', labelCount: 3 });
  const rows = groups.flatMap((group) => group.rows);

  it('offers no row that opens nothing it can deliver', () => {
    // Billing was a row with no plan, no provider and no screen behind it.
    expect(rows.map((row) => row.id)).not.toContain('billing');
  });

  it('points Profile at the editor', () => {
    expect(rows.find((row) => row.id === 'profile')?.route).toBe('/coach/profile');
  });

  it('shows the live code and label count rather than a placeholder', () => {
    expect(rows.find((row) => row.id === 'invite-code')?.value).toBe('SAM-4KQ2');
    expect(rows.find((row) => row.id === 'labels')?.value).toBe('3');
  });

  it('keeps sign out last and marked dangerous', () => {
    const last = rows[rows.length - 1];
    expect(last?.id).toBe('sign-out');
    expect(last?.danger).toBe(true);
  });
});

describe('appearance', () => {
  it('is offered on the coach side too, at the same route as the client', () => {
    const rows = buildCoachSettingsGroups({ inviteCode: 'SAM-4KQ2', labelCount: 3 }).flatMap(
      (group) => group.rows,
    );

    expect(rows.find((row) => row.id === 'appearance')?.route).toBe('/profile/theme');
  });
});
