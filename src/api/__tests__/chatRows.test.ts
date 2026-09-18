import { toChatMessages } from '@/api/rows';
import { formatTime } from '@/lib/format';

const READER = '22222222-2222-2222-2222-222222222222';
const OTHER = '11111111-1111-1111-1111-111111111111';
const NOW = new Date('2026-03-12T15:00:00Z');

function row(overrides: Partial<Parameters<typeof toChatMessages>[0][number]> = {}) {
  return {
    id: 'm1',
    body: 'How did the shoulder feel?',
    created_at: '2026-03-12T09:12:00Z',
    sender_id: OTHER,
    ...overrides,
  };
}

describe('toChatMessages', () => {
  it('tells the same thread from whichever seat is reading', () => {
    // The point of resolving `from` here instead of storing it: one row, two
    // answers. Storing a side would mean storing it twice and picking the
    // right copy per reader, which is this comparison with extra steps.
    const rows = [row({ id: 'a', sender_id: OTHER }), row({ id: 'b', sender_id: READER })];

    expect(toChatMessages(rows, READER, NOW).map((m) => m.from)).toEqual(['them', 'me']);
    expect(toChatMessages(rows, OTHER, NOW).map((m) => m.from)).toEqual(['me', 'them']);
  });

  it('reads a departed sender as the other person', () => {
    // `messages.sender_id` goes NULL when somebody deletes their account. The
    // message still happened, and it is not suddenly the reader's own.
    const [message] = toChatMessages([row({ sender_id: null })], READER, NOW);

    expect(message.from).toBe('them');
    expect(message.text).toBe('How did the shoulder feel?');
  });

  it('keeps the thread in the order it was said', () => {
    const rows = [
      row({ id: 'a', body: 'First' }),
      row({ id: 'b', body: 'Second' }),
      row({ id: 'c', body: 'Third' }),
    ];

    expect(toChatMessages(rows, READER, NOW).map((m) => m.text)).toEqual([
      'First',
      'Second',
      'Third',
    ]);
  });

  it('stamps each turn for where it sits in the thread', () => {
    const [today, thisWeek] = toChatMessages(
      [
        row({ id: 'a', created_at: '2026-03-12T09:12:00Z' }),
        row({ id: 'b', created_at: '2026-03-09T09:12:00Z' }),
      ],
      READER,
      NOW,
    );

    // Compared against `formatTime` rather than a pattern: a 12-hour locale
    // renders "10:12 AM", so "contains no letters" is not what "just the
    // clock" means anywhere but here.
    expect(today.when).toBe(formatTime('2026-03-12T09:12:00Z'));
    expect(thisWeek.when).toBe(`Mon ${formatTime('2026-03-09T09:12:00Z')}`);
  });
});
