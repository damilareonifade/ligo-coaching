import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiRosterClient } from '@/api/types';
import NewGroupContent from '@/screens/new-group/NewGroupContent';

const mockCreate = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
}));

jest.mock('@/api/community', () => ({
  useCreateGroupMutation: () => ({ mutate: mockCreate, isPending: false }),
}));

const CLIENTS = [
  {
    id: 'rc-maya',
    name: 'Maya A.',
    initials: 'MA',
    meta: 'Upper/Lower · week 6',
    attention: 'none',
    access: 'partial',
    labelId: null,
  },
] as unknown as readonly ApiRosterClient[];

/** Runs the mutation's `onSuccess` the way the real one does, with the new id. */
function succeed(groupId = 'grp-9') {
  const [, handlers] = mockCreate.mock.calls[0] as [unknown, { onSuccess: (id: string) => void }];
  handlers.onSuccess(groupId);
}

beforeEach(() => jest.clearAllMocks());

/**
 * Making a group from the seat with no roster.
 *
 * This screen was the coach's and assumed it twice over: it rendered a pick
 * list built from `useRosterQuery`, and it kept the button disabled until
 * somebody was picked. A client has no roster — `coach_clients` has no row
 * where they are the coach — so both together meant a client who reached this
 * screen could look at it and do nothing, which is what "a client cannot
 * create a group" actually was.
 *
 * The database never required the invites: `create_group` takes a name and
 * nothing else, and `invite_to_group` is a separate call that only accepts
 * people the caller is `is_linked_to`. A client's group fills by its code.
 */
describe('NewGroupContent', () => {
  it('shows a client no roster to invite from, because they have none', async () => {
    await render(<NewGroupContent clients={[]} isClient />);

    expect(screen.queryByText('INVITE FROM ROSTER')).toBeNull();
    expect(screen.getByText('Create group')).toBeTruthy();
  });

  it('lets a client create on a name alone', async () => {
    await render(<NewGroupContent clients={[]} isClient />);

    await fireEvent.changeText(screen.getByTestId('new-group-name'), 'Tuesday lifters');
    await fireEvent.press(screen.getByTestId('new-group-send'));

    // No invites, and none attempted: there is nobody a client may invite.
    expect(mockCreate).toHaveBeenCalledWith(
      { name: 'Tuesday lifters', clientIds: [] },
      expect.anything(),
    );
  });

  it('sends a client to their new group, where the only way in is written down', async () => {
    await render(<NewGroupContent clients={[]} isClient />);

    await fireEvent.changeText(screen.getByTestId('new-group-name'), 'Tuesday lifters');
    await fireEvent.press(screen.getByTestId('new-group-send'));
    succeed('grp-9');

    // Back to the list would leave them holding a group of one with no way to
    // find its code — the group's own screen is where it is shown.
    expect(mockReplace).toHaveBeenCalledWith('/community/group/grp-9/manage');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('still makes a coach pick somebody before the invites go out', async () => {
    await render(<NewGroupContent clients={CLIENTS} isClient={false} />);

    expect(screen.getByText('INVITE FROM ROSTER')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('new-group-name'), 'Summer strength');
    await fireEvent.press(screen.getByTestId('new-group-send'));

    // A name is not enough on this side: the button sends invitations, and
    // there are none to send.
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns a coach to the list they came from', async () => {
    await render(<NewGroupContent clients={CLIENTS} isClient={false} />);

    await fireEvent.changeText(screen.getByTestId('new-group-name'), 'Summer strength');
    await fireEvent.press(screen.getByTestId('pick-rc-maya'));
    await fireEvent.press(screen.getByTestId('new-group-send'));
    succeed();

    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
