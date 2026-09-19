import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiCommunityGroup, ApiCommunityMember } from '@/api/types';
import GroupContent from '@/screens/community-group/GroupContent';
import { useAuthStore } from '@/store/authStore';

const mockLeave = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

jest.mock('@/api/community', () => ({
  useLeaveGroupMutation: () => ({ mutate: mockLeave, isPending: false }),
  useSendGroupMessageMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const ME = 'me-1';

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
    isAdmin: true,
    leavingDeletes: false,
    boards: [],
    ownerName: 'Sam O.',
    myIdentity: 'first',
    myDisplayName: 'Sam O.',
    members: [member({ clientId: ME, displayName: 'Sam O.', isAdmin: true }), member()],
    messages: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: { role: 'client' } as never });
});

/**
 * Leaving a group, and the one case where leaving is not what it does.
 *
 * Nothing in this app deletes a group. The last admin walking out is the only
 * thing that ends one — `leave_group` drops the row and the thread and every
 * message goes by cascade — and this sheet was telling that person the
 * opposite: "messages you already sent stay", "the thread keeps its history
 * for the members still in it", "you can be invited back". There were no
 * members still in it and nothing to be invited back to.
 *
 * `would_orphan_group` had been in the database since the feature shipped with
 * no caller anywhere.
 */
describe('GroupContent leaving', () => {
  it('says leave, and means it, while somebody else can run the group', async () => {
    await render(<GroupContent group={group({ leavingDeletes: false })} />);

    expect(screen.getByTestId('group-leave')).toHaveTextContent('Leave');

    await fireEvent.press(screen.getByTestId('group-leave'));

    expect(screen.getByText('Leave Tuesday lifters?')).toBeTruthy();
    expect(screen.getByText('Messages you already sent stay')).toBeTruthy();
  });

  it('says delete when the reader is the last admin', async () => {
    await render(<GroupContent group={group({ leavingDeletes: true })} />);

    // The word has to say which act it is before it is tapped.
    expect(screen.getByTestId('group-leave')).toHaveTextContent('Delete');

    await fireEvent.press(screen.getByTestId('group-leave'));

    expect(screen.getByText('Delete Tuesday lifters?')).toBeTruthy();
  });

  it('tells the last admin what actually happens, not the opposite', async () => {
    await render(<GroupContent group={group({ leavingDeletes: true })} />);
    await fireEvent.press(screen.getByTestId('group-leave'));

    expect(screen.getByText('The group goes, for everyone')).toBeTruthy();
    expect(screen.getByText('Every message goes with it')).toBeTruthy();
    // The reassurance that was false for this person, and is now absent.
    expect(screen.queryByText('Messages you already sent stay')).toBeNull();
  });

  it('offers the handover instead, which is the way to keep the group', async () => {
    await render(<GroupContent group={group({ leavingDeletes: true })} />);
    await fireEvent.press(screen.getByTestId('group-leave'));

    expect(screen.getByText('Or hand it over instead')).toBeTruthy();
  });

  it('gives a coach a way out of their own group', async () => {
    // A coach is a thread member like anybody else — `create_group` puts its
    // maker in as first member and first admin. This seat used to get no
    // action at all, so a coach who made a group could never end it.
    useAuthStore.setState({ user: { role: 'coach' } as never });
    await render(<GroupContent group={group({ leavingDeletes: true })} />);

    expect(screen.getByTestId('group-leave')).toBeTruthy();
  });

  it('leaves through the one function that decides which it was', async () => {
    await render(<GroupContent group={group({ leavingDeletes: true })} />);
    await fireEvent.press(screen.getByTestId('group-leave'));
    await fireEvent.press(screen.getByTestId('leave-confirm'));

    expect(mockLeave).toHaveBeenCalledWith('grp-1', expect.anything());
  });
});
