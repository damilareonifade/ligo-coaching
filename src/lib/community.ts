import type {
  ApiBoardMetricOption,
  ApiBoardRow,
  ApiBoardStat,
  ApiCommunity,
  ApiGroupMessage,
  ApiIdentityOption,
  BoardMetric,
  BoardWindow,
  CommunityIdentity,
} from '@/api/types';

/* ------------------------------------------------------------------ *
 * Community helpers.
 *
 * Every string a client is asked to consent to is composed here rather
 * than typed into a screen. Two reasons, and the second is the real
 * one. Composing it once means the member count in the notice and the
 * member count in the header cannot drift apart. And a promise the app
 * makes about visibility is a claim about behaviour — it belongs
 * somewhere a test can hold it to its exact words, not scattered
 * across six components where a later edit can quietly soften it.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Identity. Chosen per board and per group, never once per client:
 * appearing as "Maya A." among six people you train with is a
 * different decision from appearing as "Maya A." among thirty, and
 * the app is not entitled to make the second one on the strength of
 * the first.
 * ------------------------------------------------------------------ */

/**
 * The name that will actually be shown, given a choice and a real name.
 *
 * `handle` deliberately does not fall back to the real name when the box is
 * empty. The whole point of the option is that no part of the real name is
 * shown, and a fallback would publish exactly what it was picked to withhold —
 * so an empty handle resolves to an empty string, and the caller must block on
 * it rather than quietly substituting something.
 */
export function resolveDisplayName(
  identity: CommunityIdentity,
  realName: string,
  handle: string,
): string {
  const trimmedName = realName.trim();

  switch (identity) {
    case 'real':
      return trimmedName;
    case 'handle':
      return handle.trim();
    case 'first':
    default: {
      const parts = trimmedName.split(/\s+/).filter((part) => part.length > 0);
      const first = parts[0] ?? '';
      const last = parts.length > 1 ? parts[parts.length - 1] : '';
      return last.length > 0 ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
    }
  }
}

/** Whether a chosen identity is complete enough to join with. */
export function isIdentityReady(identity: CommunityIdentity, handle: string): boolean {
  return resolveDisplayName(identity, 'Placeholder Name', handle).length > 0;
}

/** The example handle offered before the client has typed one of their own. */
const SAMPLE_HANDLE = 'IronFox';

/**
 * The three ways to appear, each showing what it would actually render for
 * this client. An abstract description of "first name only" is not a choice
 * anyone can make; seeing "Maya A." next to it is.
 *
 * The samples are built from the real name rather than authored, so the
 * preview on the opt-in screen and the row that appears on the board after
 * joining are the same string produced by the same function.
 */
export function identityOptions(realName: string): readonly ApiIdentityOption[] {
  return [
    {
      id: 'real',
      label: 'Real name',
      desc: 'Everyone sees the name on your profile.',
      sample: resolveDisplayName('real', realName, ''),
    },
    {
      id: 'first',
      label: 'First name only',
      desc: 'First name and last initial. The default.',
      sample: resolveDisplayName('first', realName, ''),
    },
    {
      id: 'handle',
      label: 'Custom handle',
      desc: 'No part of your real name is shown.',
      sample: SAMPLE_HANDLE,
    },
  ];
}

/**
 * What a coach can rank people on. Body weight is the one entry that can hurt
 * someone to publish — a ranking of who is heaviest, shown to everyone they
 * train with — so it carries a flag rather than relying on a screen to
 * remember to treat it differently.
 */
export const BOARD_METRIC_OPTIONS: readonly ApiBoardMetricOption[] = [
  { id: 'volume', label: 'Total volume lifted', desc: 'Sum of weight × reps' },
  { id: 'sessions', label: 'Sessions completed', desc: 'Count of finished workouts' },
  { id: 'streak', label: 'Longest streak', desc: 'Consecutive weeks on plan' },
  { id: 'weight-lifted', label: 'Best single lift', desc: 'Heaviest set logged' },
  {
    id: 'bodyweight',
    label: 'Body weight change',
    desc: 'Percentage change over the window',
    sensitive: true,
  },
];

export interface BoardWindowOption {
  readonly id: BoardWindow;
  readonly label: string;
}

export const BOARD_WINDOW_OPTIONS: readonly BoardWindowOption[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'custom', label: 'Custom' },
];

/** The window as it will read under the board's name. */
export function boardWindowLabel(window: BoardWindow, from: string, to: string): string {
  switch (window) {
    case 'week':
      return 'This week';
    case 'month':
      return 'This month';
    case 'quarter':
      return 'This quarter';
    case 'custom':
    default:
      return from.trim().length > 0 && to.trim().length > 0
        ? `${from.trim()} – ${to.trim()}`
        : 'Custom range';
  }
}

/** "Total volume lifted · This month · updates hourly" — the board's subtitle. */
export function boardMetricLabel(metric: BoardMetric, windowLabel: string): string {
  const option = BOARD_METRIC_OPTIONS.find((candidate) => candidate.id === metric);
  return `${option?.label ?? 'Total volume lifted'} · ${windowLabel} · updates hourly`;
}

/* ------------------------------------------------------------------ *
 * Rankings.
 * ------------------------------------------------------------------ */

/** 1 → "1st", 2 → "2nd", 11 → "11th". */
export function ordinal(n: number): string {
  const lastTwo = Math.abs(n) % 100;
  const lastOne = Math.abs(n) % 10;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? 'th'
      : lastOne === 1
        ? 'st'
        : lastOne === 2
          ? 'nd'
          : lastOne === 3
            ? 'rd'
            : 'th';

  return `${n}${suffix}`;
}

/**
 * The three numbers above a board, derived from the rows rather than authored
 * alongside them — the same rule the roster's KPIs follow. "Ranked" counts the
 * rows that exist, which is the count of people who opted in and nothing else:
 * an authored total would be the one place a board could accidentally admit
 * how many people it can see.
 *
 * Empty until the reader has a row of their own. A "Your rank" on a board you
 * have not joined would be a ranking of someone who never agreed to be ranked.
 */
export function deriveBoardStats(rows: readonly ApiBoardRow[]): readonly ApiBoardStat[] {
  const mine = rows.find((row) => row.isMe);
  if (!mine) return [];

  return [
    { value: ordinal(mine.rank), label: 'Your rank' },
    { value: mine.value, label: 'Your total' },
    { value: String(rows.length), label: 'Ranked' },
  ];
}

/** `+2` climbs, `−1` falls, `—` held. Anything unrecognised stays quiet. */
export function deltaTone(delta: string): 'success' | 'danger' | 'muted' {
  if (delta.startsWith('+')) return 'success';
  // U+2212 minus, as the API composes it — not a hyphen.
  if (delta.startsWith('−') || delta.startsWith('-')) return 'danger';
  return 'muted';
}

/** Rows, renumbered top to bottom. A ranking with two 4ths is a bug on screen. */
export function withRanks(rows: readonly ApiBoardRow[]): readonly ApiBoardRow[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

/* ------------------------------------------------------------------ *
 * Group threads.
 * ------------------------------------------------------------------ */

/**
 * A bubble as the shared chat components want it. Structurally identical to
 * `ChatBubbleMessage` in src/screens/chat/ChatBubble.tsx, and deliberately not
 * imported from there: this module sits under the components, not beside them.
 */
export interface GroupBubble {
  readonly id: string;
  readonly text: string;
  readonly when: string;
  readonly from: 'me' | 'them';
  /** Undefined once a message is grouped under the one above it. */
  readonly senderName?: string;
  readonly isCoach?: boolean;
}

/**
 * Names the first message of each run and lets the rest sit unlabelled.
 *
 * The label is not decoration. A group thread is the one place in the app
 * where a client's chosen display name is shown back to them next to their own
 * words — so their own messages are labelled too, and someone who picked a
 * handle can see, in the thread, exactly what the other six people see.
 */
export function labelGroupMessages(
  messages: readonly ApiGroupMessage[],
): readonly GroupBubble[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const grouped = previous?.senderId === message.senderId;

    return {
      id: message.id,
      text: message.text,
      when: message.when,
      from: message.from,
      senderName: grouped ? undefined : message.senderName,
      isCoach: message.isCoach,
    };
  });
}

/* ------------------------------------------------------------------ *
 * The copy. Quoted from the design and kept verbatim — these are the
 * feature, not labels on it.
 * ------------------------------------------------------------------ */

/** What a group shares, and the much longer list of what it does not. */
export function groupVisibilityNotice(memberCount: number): string {
  return `Messages here are visible to all ${memberCount} members. Your logs, measurements and photos are not.`;
}

/**
 * Said on the board itself, under the rows, in both directions at once: they
 * are not listed for you, and you are not listed for them. The plural is
 * softened for a count of one; every other word is the design's.
 */
export function notOptedInNotice(count: number): string {
  const noun = count === 1 ? 'invited client has' : 'invited clients have';
  return `${count} ${noun} not opted in. They are not listed, and they cannot see you.`;
}

/** What leaving actually costs, said before the confirm rather than after. */
export function leaveBoardNote(coachName: string): string {
  return `Leaving removes you from the ranking immediately. Your training history is untouched, and ${coachName} stays your coach.`;
}

/** The opt-in screen's opening line: the invited number, and the opt-in rule. */
export function boardInviteLine(coachName: string, invitedCount: number): string {
  return `${coachName} invited ${invitedCount} clients. Only the ones who opt in appear — including you.`;
}

/** Ticked by hand, in the client's own words, before the Join button unlocks. */
export const BOARD_CONSENT_LABEL =
  'I understand my ranking and total volume will be visible to everyone on this leaderboard.';

/** Being on a board is not permission to be posted about. */
export const BOARD_SHARE_NOTE =
  'Only this metric is shared. Posting your placement anywhere outside SetTrack is a separate choice, asked for each time.';

/** The coach's half of the bargain, on the screen where they send invites. */
export const GROUP_INVITE_NOTE =
  'Each client answers on their own consent screen. You are told who accepted, never who declined and why.';

/** The same promise, worded for a board: nobody is on it until they say so. */
export const BOARD_INVITE_NOTE =
  'The board starts empty. Each client picks a display identity before their row exists.';

/**
 * What a declining client is told about what their coach is told. The coach
 * learns that the invite was answered and nothing else, which is the only
 * version of "invite" that leaves the answer genuinely free.
 */
export function declineNote(coachName: string): string {
  return `Declined. ${coachName} is told who accepted — never who declined, or why.`;
}

/* ------------------------------------------------------------------ *
 * Index and entry points.
 * ------------------------------------------------------------------ */

/**
 * The value on the profile row. Counts what the client actually belongs to —
 * a board they were invited to but have not joined is not a membership, and
 * padding the number with it would overstate what is public about them.
 */
export function communityRowValue(community: ApiCommunity): string {
  const joined = community.groups.length + community.boards.filter((board) => board.optedIn).length;
  const invites = community.invites.length;

  const parts: string[] = [];
  if (joined > 0) parts.push(`${joined} joined`);
  if (invites > 0) parts.push(`${invites} invite${invites === 1 ? '' : 's'}`);

  return parts.length > 0 ? parts.join(' · ') : 'None yet';
}

/**
 * A group's own name in the header bar, when it fits there.
 *
 * A navigation title that truncates mid-word tells the reader less than the
 * generic word does, so a long name falls back rather than being sliced — the
 * name is on the index they arrived from either way.
 */
const MAX_HEADER_TITLE = 24;

export function groupScreenTitle(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_HEADER_TITLE ? trimmed : 'Group';
}

/** The live sentence over the coach's Send invites button. */
export function inviteSummaryLine(selectedCount: number, kind: 'group' | 'board'): string {
  const target = kind === 'group' ? 'the group' : 'the leaderboard';

  if (selectedCount === 0) {
    return `Nobody selected yet. Pick who to invite to ${target}.`;
  }

  return `${selectedCount} client${selectedCount === 1 ? '' : 's'} will be invited to ${target}.`;
}
