import { render, screen, waitFor } from '@testing-library/react-native';

import type { GoogleSignInResult } from '@/api/googleAuth';
import GoogleCallback from '@/screens/auth/GoogleCallback';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

const mockComplete = jest.fn();
jest.mock('@/api/googleAuth', () => ({
  completeGoogleRedirect: (...args: unknown[]) => mockComplete(...args),
}));

const signIn = jest.fn(async () => undefined);

function result(overrides: Partial<GoogleSignInResult> = {}): GoogleSignInResult {
  return {
    session: {
      token: 'access-token',
      user: {
        id: 'user-3',
        name: 'Maya Andersson',
        email: 'maya@gmail.com',
        role: 'client',
        avatarUrl: null,
      },
    },
    profile: {
      id: 'user-3',
      email: 'maya@gmail.com',
      name: 'Maya Andersson',
      avatarUrl: null,
      role: 'client',
      roleConfirmed: true,
      onboardedAt: null,
    },
    roleWasUnconfirmed: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useOnboardingStore.getState().reset();
  useAuthStore.setState({ signIn });
});

describe('GoogleCallback', () => {
  it('exchanges the code once and lands an existing account in the app', async () => {
    mockComplete.mockResolvedValue(result());
    await render(<GoogleCallback code="deep-link-code" errorDescription={null} />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
    // The code is single-use, so a re-run of the effect must not spend it again.
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockComplete).toHaveBeenCalledWith('deep-link-code', null);
    expect(signIn).toHaveBeenCalled();
  });

  it('sends a brand-new account to the role picker', async () => {
    mockComplete.mockResolvedValue(result({ roleWasUnconfirmed: true }));
    await render(<GoogleCallback code="deep-link-code" errorDescription={null} />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding/choose-role');
    });
  });

  it("carries Google's details into onboarding", async () => {
    mockComplete.mockResolvedValue(result());
    await render(<GoogleCallback code="deep-link-code" errorDescription={null} />);

    await waitFor(() => {
      expect(useOnboardingStore.getState().name).toBe('Maya Andersson');
    });
    expect(useOnboardingStore.getState().email).toBe('maya@gmail.com');
  });

  it('passes the in-progress signup role through, when there is one', async () => {
    useOnboardingStore.getState().setRole('coach');
    mockComplete.mockResolvedValue(result({ roleWasUnconfirmed: true }));
    await render(<GoogleCallback code="deep-link-code" errorDescription={null} />);

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith('deep-link-code', 'coach');
    });
  });

  it('shows the provider error without spending a code', async () => {
    await render(<GoogleCallback code={null} errorDescription="access_denied" />);

    expect(screen.getByText('access_denied')).toBeTruthy();
    expect(mockComplete).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('bounces to sign in when the link carries nothing to complete', async () => {
    await render(<GoogleCallback code={null} errorDescription={null} />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('reports a failed exchange rather than hanging on the spinner', async () => {
    mockComplete.mockRejectedValue(new Error('code verifier should be non-empty'));
    await render(<GoogleCallback code="stale-code" errorDescription={null} />);

    await waitFor(() => {
      expect(screen.getByText('code verifier should be non-empty')).toBeTruthy();
    });
    expect(screen.getByTestId('callback-back-to-login')).toBeTruthy();
  });
});
