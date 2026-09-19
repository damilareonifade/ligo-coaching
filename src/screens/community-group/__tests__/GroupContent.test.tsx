import { render, screen } from '@testing-library/react-native';

import type { ApiCommunityGroup, ApiCommunityMember } from '@/api/types';
import GroupContent from '@/screens/community-group/GroupContent';
import { useAuthStore } from '@/store/authStore';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/api/community', () => ({
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
    leavingDeletes: true,
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
 * The group's conversation, and what is deliberately not on it.
 *
 * Leaving used to sit in the corner of the header card here — one caption-
 * sized word, a tap away from the composer, for the act that deletes the
 * group and every message in it when the last admin does it. It belongs with
 * the members, the rankings and the join code on the manage screen, and the
 * way through to that is the members count.
 */
describe('GroupContent', () => {
  it('keeps an irreversible act off the screen people are typing on', async () => {
    await render(<GroupContent group={group()} />);

    expect(screen.queryByTestId('group-leave')).toBeNull();
  });

  it('is the same for a coach, who is a member of their own group', async () => {
    useAuthStore.setState({ user: { role: 'coach' } as never });
    await render(<GroupContent group={group()} />);

    expect(screen.queryByTestId('group-leave')).toBeNull();
  });

  it('offers the members count as the way into everything else', async () => {
    await render(<GroupContent group={group()} />);

    // Where leaving, the rankings and the join code all are.
    expect(screen.getByTestId('group-manage')).toHaveTextContent('2 members');
  });
});
