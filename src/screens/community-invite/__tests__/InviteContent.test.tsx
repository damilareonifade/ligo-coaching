import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiCommunityInvite } from '@/api/types';
import InviteContent from '@/screens/community-invite/InviteContent';

const mockAccept = jest.fn();
const mockDecline = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

jest.mock('@/api/community', () => ({
  useAcceptInviteMutation: () => ({ mutate: mockAccept, isPending: false }),
  useDeclineInviteMutation: () => ({ mutate: mockDecline, isPending: false }),
}));

function invite(overrides: Partial<ApiCommunityInvite> = {}): ApiCommunityInvite {
  return {
    id: 'inv-1',
    kind: 'group',
    targetId: 'grp-1',
    name: 'Tuesday lifters',
    ownerName: 'Sam O.',
    summary: 'Six people who train together on Tuesdays.',
    visible: ['Your messages in the group'],
    hidden: ['Everything else'],
    ...overrides,
  } as ApiCommunityInvite;
}

function renderInvite(overrides: Partial<ApiCommunityInvite> = {}) {
  return render(
    <InviteContent
      invite={invite(overrides)}
      realName="Maya Andersson"
      onAnswered={jest.fn()}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

/**
 * Accepting a group invitation is also choosing how you appear in it.
 *
 * This screen used to send `identity: 'first'` for everybody, whatever they
 * would have said — the app answering a privacy question on their behalf. And
 * answering it for good: nothing updates a group identity once it is written,
 * so the only way out was to leave the group and rejoin by its code.
 *
 * A board invitation is the exception. It leads to that board's own opt-in,
 * which asks there against that board's facts, so asking here as well would
 * be asking twice and letting the second answer quietly win.
 */
describe('InviteContent', () => {
  it('asks how you will appear before you are in the group', async () => {
    await renderInvite();

    expect(screen.getByText('CHOOSE HOW YOU APPEAR')).toBeTruthy();
    // The option shows the name it would actually produce, not a description
    // of it — you can only consent to what you can see.
    expect(screen.getByText('Maya A.')).toBeTruthy();
  });

  it('sends the choice that was made, not the one the app used to assume', async () => {
    await renderInvite();

    await fireEvent.press(screen.getByTestId('identity-real'));
    await fireEvent.press(screen.getByTestId('invite-accept'));

    expect(mockAccept).toHaveBeenCalledWith(
      { inviteId: 'inv-1', identity: 'real', handle: '' },
      expect.anything(),
    );
  });

  it('still defaults to the least exposing option that shows a person', async () => {
    await renderInvite();

    await fireEvent.press(screen.getByTestId('invite-accept'));

    expect(mockAccept).toHaveBeenCalledWith(
      { inviteId: 'inv-1', identity: 'first', handle: '' },
      expect.anything(),
    );
  });

  it('will not accept on a handle nobody typed', async () => {
    await renderInvite();

    await fireEvent.press(screen.getByTestId('identity-handle'));
    await fireEvent.press(screen.getByTestId('invite-accept'));

    // An empty handle would put a nameless row in the members list.
    expect(mockAccept).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('identity-handle-input'), 'IronFox');
    await fireEvent.press(screen.getByTestId('invite-accept'));

    expect(mockAccept).toHaveBeenCalledWith(
      { inviteId: 'inv-1', identity: 'handle', handle: 'IronFox' },
      expect.anything(),
    );
  });

  it('does not ask twice for a board, which has its own opt-in', async () => {
    await renderInvite({ kind: 'board', targetId: 'brd-1' });

    expect(screen.queryByText('CHOOSE HOW YOU APPEAR')).toBeNull();

    await fireEvent.press(screen.getByTestId('invite-accept'));
    expect(mockAccept).toHaveBeenCalled();
  });
});
