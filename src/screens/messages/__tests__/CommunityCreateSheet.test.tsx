import { fireEvent, render, screen } from '@testing-library/react-native';

import CommunityCreateSheet from '@/screens/messages/CommunityCreateSheet';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

/**
 * Written because the failure this covers is silent.
 *
 * On `LIModal` the `+` in the Messages header did nothing: the bottom sheet
 * measures its own content to decide its height and presented at zero, with
 * no error anywhere to say so. `LeaveSheet` had already been moved off it for
 * the same reason — "Detach coach does nothing", reported twice before anyone
 * found it — and this was the last caller left to repeat it.
 *
 * `LIDialog` is React Native's own `Modal`, which the platform draws and which
 * has no measuring step to get wrong. So what is asserted here is not the
 * height, which Jest cannot see, but that the choices are in the tree at all —
 * the sheet renders nothing when it is closed and its choice when it is open,
 * and neither of those was true of the version that shipped.
 */
describe('CommunityCreateSheet', () => {
  it('shows nothing until it is opened', async () => {
    await render(<CommunityCreateSheet visible={false} onClose={jest.fn()} />);

    expect(screen.queryByTestId('create-group')).toBeNull();
  });

  it('offers a group, and says what making one does not do', async () => {
    await render(<CommunityCreateSheet visible onClose={jest.fn()} />);

    expect(screen.getByTestId('create-group')).toBeTruthy();
    // The promise under it, which is the whole consent model in one line.
    expect(
      screen.getByText('You are sending invitations. Nobody is added to anything.'),
    ).toBeTruthy();
  });

  it('does not offer a leaderboard as a thing beside a group', async () => {
    // A ranking lives inside a group and has nowhere else to be — and a group
    // can rank several things at once, so it was never one choice either.
    await render(<CommunityCreateSheet visible onClose={jest.fn()} />);

    expect(screen.queryByTestId('create-board')).toBeNull();
  });

  it('closes itself on the way out, so it is not behind the screen it opened', async () => {
    const onClose = jest.fn();
    await render(<CommunityCreateSheet visible onClose={onClose} />);

    await fireEvent.press(screen.getByTestId('create-group'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/community/new-group');
  });

  it('shows nothing of a board route any more', async () => {
    await render(<CommunityCreateSheet visible onClose={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('create-group'));

    expect(mockPush).not.toHaveBeenCalledWith('/community/new-board');
  });
});
