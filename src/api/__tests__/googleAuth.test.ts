import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { ApiError } from '@/api/client';
import { signInWithGoogle } from '@/api/googleAuth';
import { supabase } from '@/api/supabase';
import type { ApiProfile } from '@/api/types';
import * as users from '@/api/users';

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// `createURL` reads the scheme out of the expo-constants manifest, which Jest
// has no access to.
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `ligo://${path}`,
}));

const signInWithOAuth = jest.spyOn(supabase.auth, 'signInWithOAuth');
const exchangeCodeForSession = jest.spyOn(supabase.auth, 'exchangeCodeForSession');
// `public.users` is the authority on role, not the provider's metadata.
const fetchOwnProfile = jest.spyOn(users, 'fetchOwnProfile');
const confirmRole = jest.spyOn(users, 'confirmRole');

const REDIRECT = Linking.createURL('auth/callback');

function profile(overrides: Partial<ApiProfile> = {}): ApiProfile {
  return {
    id: 'user-9',
    email: 'maya@example.com',
    name: 'Maya Andersson',
    avatarUrl: 'https://example.com/maya.png',
    role: 'client',
    roleConfirmed: true,
    onboardedAt: null,
    ...overrides,
  };
}

function succeedsWithCode(code: string) {
  jest
    .mocked(WebBrowser.openAuthSessionAsync)
    .mockResolvedValue({ type: 'success', url: `${REDIRECT}?code=${code}` });
  exchangeCodeForSession.mockResolvedValue({
    data: {
      session: { access_token: 'supabase-access-token', user: { id: 'user-9' } },
    },
    error: null,
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  signInWithOAuth.mockResolvedValue({
    data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/auth?state=x' },
    error: null,
  } as never);
  fetchOwnProfile.mockResolvedValue(profile());
});

describe('signInWithGoogle', () => {
  it('exchanges the code and returns the session alongside the profile row', async () => {
    succeedsWithCode('auth-code-1');

    const result = await signInWithGoogle(null);

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
    });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('auth-code-1');
    expect(result).toEqual({
      session: {
        token: 'supabase-access-token',
        user: {
          id: 'user-9',
          name: 'Maya Andersson',
          email: 'maya@example.com',
          role: 'client',
          avatarUrl: 'https://example.com/maya.png',
        },
      },
      profile: profile(),
      roleWasUnconfirmed: false,
    });
  });

  it('resolves to null when the browser is dismissed', async () => {
    // `type` is enum-typed, and the mocked module carries no enum to read.
    jest
      .mocked(WebBrowser.openAuthSessionAsync)
      .mockResolvedValue({ type: 'dismiss' } as WebBrowser.WebBrowserAuthSessionResult);

    await expect(signInWithGoogle(null)).resolves.toBeNull();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('surfaces a consent denial as an ApiError', async () => {
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: 'success',
      url: `${REDIRECT}?error=access_denied&error_description=You%20said%20no`,
    });

    await expect(signInWithGoogle(null)).rejects.toThrow(new ApiError('You said no', null));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('surfaces a failed code exchange as an ApiError', async () => {
    jest
      .mocked(WebBrowser.openAuthSessionAsync)
      .mockResolvedValue({ type: 'success', url: `${REDIRECT}?code=stale` });
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'code verifier should be non-empty', status: 400 },
    } as never);

    await expect(signInWithGoogle(null)).rejects.toThrow(ApiError);
    expect(fetchOwnProfile).not.toHaveBeenCalled();
  });

  it('confirms the chosen role for an account that has never picked one', async () => {
    succeedsWithCode('auth-code-2');
    fetchOwnProfile.mockResolvedValue(profile({ roleConfirmed: false }));
    confirmRole.mockResolvedValue(profile({ role: 'coach', roleConfirmed: true }));

    const result = await signInWithGoogle('coach');

    expect(confirmRole).toHaveBeenCalledWith({ role: 'coach' });
    expect(result?.profile.role).toBe('coach');
    expect(result?.session.user.role).toBe('coach');
    // Tells the caller this account is new here, so it belongs in onboarding.
    expect(result?.roleWasUnconfirmed).toBe(true);
  });

  it('never re-confirms a role that is already settled', async () => {
    succeedsWithCode('auth-code-3');
    fetchOwnProfile.mockResolvedValue(profile({ role: 'client', roleConfirmed: true }));

    const result = await signInWithGoogle('coach');

    // An existing client tapping Google on the signup screen must stay a
    // client — the database refuses the change, and so does this.
    expect(confirmRole).not.toHaveBeenCalled();
    expect(result?.profile.role).toBe('client');
    // And the caller sends them to the app, not back through onboarding.
    expect(result?.roleWasUnconfirmed).toBe(false);
  });

  it('leaves the role unset when signing in from the login screen', async () => {
    succeedsWithCode('auth-code-4');
    fetchOwnProfile.mockResolvedValue(profile({ roleConfirmed: false }));

    const result = await signInWithGoogle(null);

    expect(confirmRole).not.toHaveBeenCalled();
    // The caller routes to the role picker on this.
    expect(result?.profile.roleConfirmed).toBe(false);
  });
});
