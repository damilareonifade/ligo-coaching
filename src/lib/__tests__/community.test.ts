import type { ApiBoardRow, ApiCommunity, ApiGroupMessage } from '@/api/types';
import {
  BOARD_CONSENT_LABEL,
  BOARD_METRIC_OPTIONS,
  BOARD_INVITE_NOTE,
  BOARD_SHARE_NOTE,
  GROUP_INVITE_NOTE,
  boardInviteLine,
  boardMetricLabel,
  communityRowValue,
  deltaTone,
  deriveBoardStats,
  groupScreenTitle,
  groupVisibilityNotice,
  inviteSummaryLine,
  isIdentityReady,
  labelGroupMessages,
  leaveBoardNote,
  notOptedInNotice,
  ordinal,
  resolveDisplayName,
  withRanks,
} from '@/lib/community';

function row(overrides: Partial<ApiBoardRow>): ApiBoardRow {
  return {
    rank: 1,
    displayName: 'Tomas L.',
    initials: 'TL',
    value: '48,920 kg',
    sub: '14 sessions',
    delta: '—',
    isMe: false,
    ...overrides,
  };
}

function message(overrides: Partial<ApiGroupMessage>): ApiGroupMessage {
  return {
    id: 'gm-x',
    senderId: 'cm-sam',
    senderName: 'Sam Okafor',
    isCoach: true,
    text: 'Deload next week.',
    when: 'Tue 18:40',
    from: 'them',
    ...overrides,
  };
}

describe('resolveDisplayName', () => {
  it('renders each identity the way its sample promises', () => {
    expect(resolveDisplayName('real', 'Maya Andersson', '')).toBe('Maya Andersson');
    expect(resolveDisplayName('first', 'Maya Andersson', '')).toBe('Maya A.');
    expect(resolveDisplayName('handle', 'Maya Andersson', 'IronFox')).toBe('IronFox');
  });

  it('never leaks any part of the real name behind an empty handle', () => {
    // The fallback a careless implementation would reach for is exactly the
    // thing this option exists to withhold.
    expect(resolveDisplayName('handle', 'Maya Andersson', '')).toBe('');
    expect(resolveDisplayName('handle', 'Maya Andersson', '   ')).toBe('');
    expect(isIdentityReady('handle', '')).toBe(false);
    expect(isIdentityReady('handle', 'IronFox')).toBe(true);
    expect(isIdentityReady('first', '')).toBe(true);
  });

  it('copes with a one-word name rather than inventing an initial', () => {
    expect(resolveDisplayName('first', 'Prince', '')).toBe('Prince');
  });
});

describe('ordinal', () => {
  it('handles the teens, which are not 1st/2nd/3rd', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ]);
  });
});

describe('deriveBoardStats', () => {
  const rows = [
    row({ rank: 1 }),
    row({ rank: 2, displayName: 'Maya A.', value: '42,180 kg', sub: '12 sessions', isMe: true }),
    row({ rank: 3, displayName: 'Priya B.', value: '39,640 kg' }),
    row({ rank: 4 }),
    row({ rank: 5 }),
    row({ rank: 6 }),
  ];

  it('reads the three numbers off the rows rather than trusting an authored set', () => {
    expect(deriveBoardStats(rows)).toEqual([
      { value: '2nd', label: 'Your rank' },
      { value: '42,180 kg', label: 'Your total' },
      { value: '6', label: 'Ranked' },
    ]);
  });

  it('says nothing at all about a reader who has no row', () => {
    expect(deriveBoardStats(rows.filter((entry) => !entry.isMe))).toEqual([]);
    expect(deriveBoardStats([])).toEqual([]);
  });
});

describe('deltaTone', () => {
  it('reads the sign the API composed, minus sign included', () => {
    expect(deltaTone('+2')).toBe('success');
    expect(deltaTone('−1')).toBe('danger');
    expect(deltaTone('-1')).toBe('danger');
    expect(deltaTone('—')).toBe('muted');
    expect(deltaTone('')).toBe('muted');
  });
});

describe('withRanks', () => {
  it('renumbers top to bottom so no two rows can claim one place', () => {
    const renumbered = withRanks([row({ rank: 4 }), row({ rank: 4 }), row({ rank: 9 })]);
    expect(renumbered.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });
});

describe('labelGroupMessages', () => {
  it('names the first of each run and lets the rest sit unlabelled', () => {
    const labelled = labelGroupMessages([
      message({ id: '1', senderId: 'cm-tomas', senderName: 'Tomas L.', isCoach: false }),
      message({ id: '2', senderId: 'cm-tomas', senderName: 'Tomas L.', isCoach: false }),
      message({ id: '3', senderId: 'cm-sam' }),
      message({ id: '4', senderId: 'cm-tomas', senderName: 'Tomas L.', isCoach: false }),
    ]);

    expect(labelled.map((bubble) => bubble.senderName)).toEqual([
      'Tomas L.',
      undefined,
      'Sam Okafor',
      'Tomas L.',
    ]);
  });

  it('labels the reader’s own messages too, so they see the name others see', () => {
    const labelled = labelGroupMessages([
      message({ id: '1', senderId: 'cm-maya', senderName: 'Maya A.', isCoach: false, from: 'me' }),
    ]);

    expect(labelled[0].senderName).toBe('Maya A.');
    expect(labelled[0].from).toBe('me');
  });

  it('carries the coach flag through to the badge', () => {
    const labelled = labelGroupMessages([message({ id: '1' })]);
    expect(labelled[0].isCoach).toBe(true);
  });
});

describe('the consent copy', () => {
  it('says what a group shares and what it does not, in the design’s words', () => {
    expect(groupVisibilityNotice(7)).toBe(
      'Messages here are visible to all 7 members. Your logs, measurements and photos are not.',
    );
  });

  it('states the absent count in both directions', () => {
    expect(notOptedInNotice(3)).toBe(
      '3 invited clients have not opted in. They are not listed, and they cannot see you.',
    );
    expect(notOptedInNotice(1)).toBe(
      '1 invited client has not opted in. They are not listed, and they cannot see you.',
    );
  });

  it('separates leaving a board from leaving a coach, and names nobody', () => {
    // It used to end "and Sam stays your coach", which is false of a board in
    // a group two clients made between themselves.
    expect(leaveBoardNote()).toBe(
      'Leaving removes you from the ranking immediately. Your training history is untouched, and nothing about your coaching changes.',
    );
  });

  it('opens the opt-in with the invited count and the opt-in rule', () => {
    expect(boardInviteLine('Sam Okafor', 9)).toBe(
      // "people", not "clients": a board belongs to a group, and a group made
      // by two clients has no clients in it.
      'Sam Okafor invited 9 people. Only the ones who opt in appear — including you.',
    );
  });

  it('keeps the four fixed promises exactly as written', () => {
    expect(BOARD_CONSENT_LABEL).toBe(
      'I understand my ranking and total volume will be visible to everyone on this leaderboard.',
    );
    expect(BOARD_SHARE_NOTE).toBe(
      'Only this metric is shared. Posting your placement anywhere outside SetTrack is a separate choice, asked for each time.',
    );
    expect(GROUP_INVITE_NOTE).toBe(
      'Each client answers on their own consent screen. You are told who accepted, never who declined and why.',
    );
    expect(BOARD_INVITE_NOTE).toBe(
      'The board starts empty. Each client picks a display identity before their row exists.',
    );
  });
});

describe('communityRowValue', () => {
  function community(overrides: Partial<ApiCommunity>): ApiCommunity {
    return { invites: [], groups: [], boards: [], ...overrides };
  }

  const group = {
    id: 'grp-summer',
    name: 'Summer strength group',
    ownerName: 'Sam Okafor',
    memberCount: 7,
    preview: 'Good timing.',
    when: 'Tue',
  };
  const board = (optedIn: boolean) => ({
    id: optedIn ? 'brd-autumn' : 'brd-winter',
    name: 'Autumn volume challenge',
    ownerName: 'Sam Okafor',
    metricLabel: 'Total volume lifted',
    optedIn,
    standing: optedIn ? '2nd of 6' : 'Not joined',
    });
  const invite = {
    id: 'inv-winter',
    kind: 'group' as const,
    targetId: 'grp-winter',
    name: 'Winter push',
    ownerName: 'Sam Okafor',
    summary: 'Sam Okafor is inviting you to a group chat.',
    visible: [],
    hidden: [],
  };

  it('counts memberships, not invitations — an unanswered invite is not a membership', () => {
    expect(
      communityRowValue(
        community({ groups: [group], boards: [board(true), board(false)], invites: [invite] }),
      ),
    ).toBe('2 joined · 1 invite');
  });

  it('reads as an option not taken rather than as an error when there is nothing', () => {
    expect(communityRowValue(community({}))).toBe('None yet');
  });
});

describe('groupScreenTitle', () => {
  it('uses the group’s own name when it fits the header bar', () => {
    expect(groupScreenTitle('Summer strength group')).toBe('Summer strength group');
  });

  it('falls back rather than truncating a name mid-word', () => {
    expect(groupScreenTitle('Thursday evening powerlifting and accessories crew')).toBe('Group');
    expect(groupScreenTitle('   ')).toBe('Group');
  });
});

describe('inviteSummaryLine', () => {
  it('counts up as the coach ticks, and names the thing being joined', () => {
    expect(inviteSummaryLine(0, 'group')).toBe('Nobody selected yet. Pick who to invite to the group.');
    expect(inviteSummaryLine(1, 'group')).toBe('1 client will be invited to the group.');
    expect(inviteSummaryLine(6, 'board')).toBe('6 clients will be invited to the leaderboard.');
  });
});

describe('the board metrics', () => {
  it('labels every metric it offers', () => {
    // `boardMetricLabel` falls back to "Total volume lifted" when it cannot
    // find the id, so a metric added to the union but not to the options
    // would not fail — it would quietly label a PR board as a volume one.
    for (const option of BOARD_METRIC_OPTIONS) {
      expect(boardMetricLabel(option.id, 'This month')).toBe(
        `${option.label} · This month · updates hourly`,
      );
    }
  });

  it('ranks nobody on their body weight', () => {
    // Removed deliberately: a ranking of who is heaviest, shown to everyone
    // you train with, can hurt somebody — and percentage change cannot be
    // ordered honestly when the person cutting and the person bulking are
    // both succeeding in opposite directions.
    const ids = BOARD_METRIC_OPTIONS.map((option) => option.id);

    expect(ids).not.toContain('bodyweight');
  });

  it('asks a streak for a finished session, never for a plan', () => {
    // "Weeks on plan" needs an assigned routine, which somebody training on
    // their own does not have — and groups can be made by anyone.
    const streak = BOARD_METRIC_OPTIONS.find((option) => option.id === 'streak');

    expect(streak?.desc).toBe('Consecutive weeks with a finished session');
  });
});
