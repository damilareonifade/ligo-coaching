import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { GoogleSignInResult } from '@/api/googleAuth';
import RoleSelect from '@/screens/onboarding/RoleSelect';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';

// The `mock` prefix is required: jest hoists these factories above the
// declarations, and only mock-prefixed names may be referenced from them.
const mockReplace = jest.fn();
// Only `useRouter` is replaced: the screen's footer renders expo-router's
// `Link` through LIText, and a bare factory would leave it undefined.
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

const mockSignInWithGoogle = jest.fn();
jest.mock('@/api/googleAuth', () => ({
  useGoogleSignInMutation: () => ({ mutateAsync: mockSignInWithGoogle, isPending: false }),
}));

function googleResult(overrides: Partial<GoogleSignInResult> = {}): GoogleSignInResult {
  return {
    session: {
      token: 'access-token',
      user: {
        id: 'user-7',
        name: 'Sam Okafor',
        email: 'sam@gmail.com',
        role: 'coach',
        avatarUrl: 'https://example.com/sam.png',
      },
    },
    profile: {
      id: 'user-7',
      email: 'sam@gmail.com',
      name: 'Sam Okafor',
      avatarUrl: 'https://example.com/sam.png',
      role: 'coach',
      roleConfirmed: true,
      onboardedAt: null,
    },
    roleWasUnconfirmed: true,
    ...overrides,
  };
}

beforeEach(() => {
  // Toasts auto-dismiss on a 3.5s timer; faking it keeps that timer from
  // outliving the test and forcing the jest worker to be killed.
  jest.useFakeTimers();
  jest.clearAllMocks();
  useOnboardingStore.getState().reset();
  useUiStore.setState({ toasts: [] });
  useAuthStore.setState({ signIn: jest.fn(async () => undefined) });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('RoleSelect', () => {
  it('will not create an account with Google before a role is picked', async () => {
    await render(<RoleSelect />);

    await fireEvent.press(screen.getByTestId('continue-google'));

    // The account is created *with* a role, so there is nothing to do yet.
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
  });

  it('creates the account with Google using the chosen role', async () => {
    mockSignInWithGoogle.mockResolvedValue(googleResult());
    await render(<RoleSelect />);

    await fireEvent.press(screen.getByTestId('role-coach'));
    await fireEvent.press(screen.getByTestId('continue-google'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledWith('coach');
    });
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/coach-profile');
  });

  it("carries Google's name and address into the onboarding steps", async () => {
    mockSignInWithGoogle.mockResolvedValue(googleResult());
    await render(<RoleSelect />);

    await fireEvent.press(screen.getByTestId('role-coach'));
    await fireEvent.press(screen.getByTestId('continue-google'));

    // The whole point: never ask for what Google already told us.
    await waitFor(() => {
      expect(useOnboardingStore.getState().name).toBe('Sam Okafor');
    });
    expect(useOnboardingStore.getState().email).toBe('sam@gmail.com');
  });

  it('signs an existing account straight in, and says so', async () => {
    mockSignInWithGoogle.mockResolvedValue(
      googleResult({
        roleWasUnconfirmed: false,
        profile: { ...googleResult().profile, role: 'client' },
      }),
    );
    await render(<RoleSelect />);

    await fireEvent.press(screen.getByTestId('role-client'));
    await fireEvent.press(screen.getByTestId('continue-google'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
    // Signed in rather than bounced to the login screen — Google has already
    // vouched for them — but not silently.
    const [toast] = useUiStore.getState().toasts;
    expect(toast?.message).toBe('You already have a SetTrack account — signed you in.');
    expect(toast?.tone).toBe('info');
  });

  it('explains when the existing account has a different role than they picked', async () => {
    mockSignInWithGoogle.mockResolvedValue(
      googleResult({
        roleWasUnconfirmed: false,
        profile: { ...googleResult().profile, role: 'client' },
      }),
    );
    await render(<RoleSelect />);

    // Existing client taps "Coach others": the database refuses the change,
    // so without this message the picker would look broken.
    await fireEvent.press(screen.getByTestId('role-coach'));
    await fireEvent.press(screen.getByTestId('continue-google'));

    await waitFor(() => {
      expect(useUiStore.getState().toasts).toHaveLength(1);
    });
    expect(useUiStore.getState().toasts[0]?.message).toContain('as a client');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('says nothing extra for a brand-new account', async () => {
    mockSignInWithGoogle.mockResolvedValue(googleResult({ roleWasUnconfirmed: true }));
    await render(<RoleSelect />);

    await fireEvent.press(screen.getByTestId('role-coach'));
    await fireEvent.press(screen.getByTestId('continue-google'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding/coach-profile');
    });
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('stays put when the Google browser is dismissed', async () => {
    mockSignInWithGoogle.mockResolvedValue(null);
    await render(<RoleSelect />);

    await fireEvent.press(screen.getByTestId('role-client'));
    await fireEvent.press(screen.getByTestId('continue-google'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
