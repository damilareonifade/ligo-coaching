import { render, screen, fireEvent } from '@testing-library/react-native';

import ScreenHeader from '@/components/chrome/ScreenHeader';
import { useAuthStore } from '@/store/authStore';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => mockCanGoBack }),
  Link: () => null,
}));

function signInAs(role: 'coach' | 'client') {
  useAuthStore.setState({
    status: 'signed-in',
    user: { id: 'u1', name: 'Maya Andersson', email: 'm@example.com', role, avatarUrl: null },
  } as never);
}

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockCanGoBack = true;
  signInAs('client');
});

describe('ScreenHeader', () => {
  it('shows the eyebrow above the title', async () => {
    await render(<ScreenHeader title="Add exercise" eyebrow="Exercise library" />);

    expect(screen.getByText('Exercise library')).toBeTruthy();
    expect(screen.getByText('Add exercise')).toBeTruthy();
  });

  it('pops when the back row is pressed', async () => {
    await render(<ScreenHeader title="Add exercise" backLabel="Builder" />);

    await fireEvent.press(screen.getByTestId('screen-header-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('has no back row on a tab root', async () => {
    await render(<ScreenHeader title="Train" />);

    expect(screen.queryByTestId('screen-header-back')).toBeNull();
  });

  it('does not pop with nothing behind it', async () => {
    mockCanGoBack = false;
    await render(<ScreenHeader title="Routine" backLabel="Train" />);

    await fireEvent.press(screen.getByTestId('screen-header-back'));
    expect(mockBack).not.toHaveBeenCalled();
  });

  // The title and the way back, and nothing else unless a screen asks.
  it('does not label which side of the app you are on', async () => {
    await render(<ScreenHeader title="Train" />);
    expect(screen.queryByText('Client')).toBeNull();

    signInAs('coach');
    await render(<ScreenHeader title="Roster" />);
    expect(screen.queryByText('Coach')).toBeNull();
  });

  // The bell belongs to Today. Everywhere else it is an invitation to leave
  // the screen you just opened.
  it('carries no bell unless a screen asks for one', async () => {
    await render(<ScreenHeader title="Add exercise" eyebrow="Exercise library" />);

    expect(screen.queryByTestId('screen-header-bell')).toBeNull();
  });

  // The feed, not the settings form it used to open — two screens with
  // confusingly similar names, and the bell wants the list. One route for
  // both sides: it reads the feed for whoever is signed in.
  it('opens the feed for a client', async () => {
    await render(<ScreenHeader title="Train" bell />);

    await fireEvent.press(screen.getByTestId('screen-header-bell'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('opens the same feed for a coach', async () => {
    signInAs('coach');
    await render(<ScreenHeader title="Roster" bell />);

    await fireEvent.press(screen.getByTestId('screen-header-bell'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });
});
