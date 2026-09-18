import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiInboxEntry } from '@/api/types';
import InboxContent from '@/screens/messages/InboxContent';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const ENTRY: ApiInboxEntry = {
  clientId: 'them-1',
  name: 'Priya B.',
  initials: 'PB',
  preview: 'See you Thursday',
  when: '09:00',
  unread: false,
  accessLabel: 'You share everything with them',
};

function renderInbox(isClient: boolean, entries: readonly ApiInboxEntry[] = []) {
  return render(
    <InboxContent
      entries={entries}
      groups={[]}
      isClient={isClient}
      query=""
      onQueryChange={jest.fn()}
      refreshing={false}
      onRefresh={jest.fn()}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

/**
 * The screen is shared; the seats are not.
 *
 * Clients had no Messages tab at all, so everything in here was written to a
 * coach and could say so freely. Once both seats read the same list, the
 * coach-shaped parts stopped being harmless: an empty inbox offered "Open your
 * roster", a route no client can reach, and every row led to a per-client
 * thread the client seat does not have.
 */
describe('InboxContent', () => {
  it('sends a coach to their roster when nobody has written to them', async () => {
    await renderInbox(false);

    await fireEvent.press(screen.getByTestId('inbox-open-roster'));

    expect(mockPush).toHaveBeenCalledWith('/roster');
  });

  it('never offers a client the roster, which is not theirs to open', async () => {
    await renderInbox(true);

    expect(screen.queryByTestId('inbox-open-roster')).toBeNull();

    // An empty client inbox means one thing — no coach — because attaching
    // creates the thread. So this offers the only step that changes it, by the
    // same route Profile and Today already use.
    await fireEvent.press(screen.getByTestId('inbox-attach-coach'));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/attach-coach?direct=1');
  });

  it('opens a coach’s thread on the route that is per client', async () => {
    await renderInbox(false, [ENTRY]);

    await fireEvent.press(screen.getByTestId('inbox-row-them-1'));

    expect(mockPush).toHaveBeenCalledWith('/messages/them-1');
  });

  it('opens a client’s one conversation on the screen that already exists', async () => {
    await renderInbox(true, [ENTRY]);

    await fireEvent.press(screen.getByTestId('inbox-row-them-1'));

    // /messages/[id] is the coach's thread screen and reads the roster to
    // build itself; a client landing there gets nothing.
    expect(mockPush).toHaveBeenCalledWith('/coach/chat');
  });
});
