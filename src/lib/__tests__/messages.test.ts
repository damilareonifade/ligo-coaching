import type { ApiCoachThread, ApiInboxEntry } from '@/api/types';
import {
  appendOwnMessage,
  filterInbox,
  unreadInboxCount,
  withLatestPreview,
} from '@/lib/messages';

function entry(overrides: Partial<ApiInboxEntry>): ApiInboxEntry {
  return {
    clientId: 'rc-x',
    name: 'Test Client',
    initials: 'TC',
    preview: 'Last thing they said.',
    when: '2h',
    unread: false,
    accessLabel: 'Partial',
    ...overrides,
  };
}

const entries: readonly ApiInboxEntry[] = [
  entry({ clientId: 'rc-maya', name: 'Maya Andersson', preview: 'Felt strong today — bench moved well.', unread: true }),
  entry({ clientId: 'rc-priya', name: 'Priya Bhatt', preview: 'Can we drop the incline volume?', unread: true }),
  entry({ clientId: 'rc-ben', name: 'Ben Jarvis', preview: 'Cheers for everything.', accessLabel: 'Messaging only' }),
];

describe('filterInbox', () => {
  it('matches on the name', () => {
    expect(filterInbox(entries, 'priya').map((row) => row.clientId)).toEqual(['rc-priya']);
  });

  it('matches on the message text, which is often all a coach remembers', () => {
    expect(filterInbox(entries, 'incline').map((row) => row.clientId)).toEqual(['rc-priya']);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(filterInbox(entries, '  ANDERSSON ').map((row) => row.clientId)).toEqual(['rc-maya']);
  });

  it('returns everything for an empty search rather than nothing', () => {
    expect(filterInbox(entries, '   ')).toHaveLength(3);
  });

  it('returns nothing when neither name nor message matches', () => {
    expect(filterInbox(entries, 'deadlift')).toHaveLength(0);
  });

  it('never filters on access — messaging is open whatever is shared', () => {
    expect(filterInbox(entries, 'cheers').map((row) => row.accessLabel)).toEqual([
      'Messaging only',
    ]);
  });
});

describe('unreadInboxCount', () => {
  it('counts the conversations still waiting on the coach', () => {
    expect(unreadInboxCount(entries)).toBe(2);
  });
});

describe('appendOwnMessage', () => {
  const thread: ApiCoachThread = {
    clientId: 'rc-maya',
    name: 'Maya Andersson',
    initials: 'MA',
    accessLabel: 'Partial',
    archived: false,
    messages: [{ id: 'cm-1', from: 'them', text: 'Bench moved well.', when: 'Mon 09:12' }],
  };

  it('appends at the end — the thread reads oldest first, newest last', () => {
    const next = appendOwnMessage(thread, {
      id: 'cm-2',
      from: 'me',
      text: 'Great work.',
      when: 'now',
    });

    expect(next.messages.map((message) => message.id)).toEqual(['cm-1', 'cm-2']);
    expect(next.messages[1].from).toBe('me');
  });

  it('does not mutate the thread it was handed — the rollback needs the original', () => {
    appendOwnMessage(thread, { id: 'cm-2', from: 'me', text: 'Great work.', when: 'now' });

    expect(thread.messages).toHaveLength(1);
  });
});

describe('withLatestPreview', () => {
  it('moves the row to the coach’s own last words and clears its unread mark', () => {
    const next = withLatestPreview(entries, 'rc-maya', 'Hold the bench where it is.');
    const maya = next.find((row) => row.clientId === 'rc-maya');

    expect(maya?.preview).toBe('Hold the bench where it is.');
    expect(maya?.when).toBe('now');
    expect(maya?.unread).toBe(false);
  });

  it('leaves every other conversation alone', () => {
    const next = withLatestPreview(entries, 'rc-maya', 'Hold the bench where it is.');

    expect(next.find((row) => row.clientId === 'rc-priya')?.preview).toBe(
      'Can we drop the incline volume?',
    );
    expect(unreadInboxCount(next)).toBe(1);
  });
});
