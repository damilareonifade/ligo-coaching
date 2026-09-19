import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiCommunityGroup, ApiCommunityMember } from '@/api/types';
import GroupLeaveAction from '@/components/community/GroupLeaveAction';

const mockLeave = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

jest.mock('@/api/community', () => ({
  useLeaveGroupMutation: () => ({ mutate: mockLeave, isPending: false }),
}));

function member(overrides: Partial<ApiCommunityMember> = {}): ApiCommunityMember {
  return {
    clientId: 'them-1',
    displayName: 'Maya A.',
    initials: 'MA',
    isCoach: false,
    isAdmin: false,
    ...overrides,
  };
}

function group(overrides: Partial<ApiCommunityGroup> = {}): ApiCommunityGroup {
  return {
    id: 'grp-1',
    name: 'Tuesday lifters',
    joinCode: 'KX7F2M',
    isAdmin: false,
    leavingDeletes: false,
    boards: [],
    ownerName: 'Sam O.',
    myIdentity: 'first',
    myDisplayName: 'Maya A.',
    members: [member(), member({ clientId: 'them-2', displayName: 'Sam O.', isAdmin: true })],
    messages: [],
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

/**
 * The way out, which for a while was a 12px word.
 *
 * Leaving was one caption-sized link wedged beside the faces on the group's
 * header, and nothing at all on the manage screen — which is where anybody
 * looking for a setting looks first, and which offered members, rankings and
 * a join code but no door. A group you cannot find your way out of is not one
 * anybody should join.
 *
 * Leaving is nobody's privilege: `leave_group` asks only that you are in the
 * group. Not an admin, not the maker, not a client rather than a coach.
 */
describe('GroupLeaveAction', () => {
  it('is a real button on the screen people search, not a word in a corner', async () => {
    await render(<GroupLeaveAction group={group()} />);

    // Its own card, titled, with the button spelled out rather than "Leave".
    expect(screen.getAllByText('Leave group').length).toBeGreaterThan(0);
    expect(screen.getByTestId('group-leave')).toBeTruthy();
  });

  it('is offered to an ordinary member who runs nothing', async () => {
    await render(<GroupLeaveAction group={group({ isAdmin: false })} />);

    expect(screen.getByTestId('group-leave')).toBeTruthy();
  });

  it('asks before it acts', async () => {
    await render(<GroupLeaveAction group={group()} />);

    await fireEvent.press(screen.getByTestId('group-leave'));

    expect(mockLeave).not.toHaveBeenCalled();
    expect(screen.getByText('Leave Tuesday lifters?')).toBeTruthy();
  });

  it('leaves, and says so on the way out', async () => {
    await render(<GroupLeaveAction group={group()} />);

    await fireEvent.press(screen.getByTestId('group-leave'));
    await fireEvent.press(screen.getByTestId('leave-confirm'));

    expect(mockLeave).toHaveBeenCalledWith('grp-1', expect.anything());
  });

  it('calls it deleting when the reader is the last admin', async () => {
    await render(<GroupLeaveAction group={group({ isAdmin: true, leavingDeletes: true })} />);

    expect(screen.getAllByText('Delete group').length).toBeGreaterThan(0);
    expect(
      screen.getByText('You are its only admin, so leaving ends the group for everybody in it.'),
    ).toBeTruthy();
  });

  it('shrinks to a link for the conversation header without changing its mind', async () => {
    await render(<GroupLeaveAction group={group({ leavingDeletes: true })} compact />);

    // One word up there, but the same act and the same sheet behind it.
    expect(screen.getByTestId('group-leave')).toHaveTextContent('Delete');

    await fireEvent.press(screen.getByTestId('group-leave'));
    expect(screen.getByText('Delete Tuesday lifters?')).toBeTruthy();
  });
});
