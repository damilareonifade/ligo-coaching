import { ApiError } from '@/api/client';
import { completePasswordReset, requestPasswordReset } from '@/api/passwordReset';
import { supabase } from '@/api/supabase';

jest.mock('expo-linking', () => ({ createURL: (path: string) => `ligo://${path}` }));

const rpc = jest.spyOn(supabase, 'rpc');
const resetPasswordForEmail = jest.spyOn(supabase.auth, 'resetPasswordForEmail');
const updateUser = jest.spyOn(supabase.auth, 'updateUser');
const signOut = jest.spyOn(supabase.auth, 'signOut');

beforeEach(() => {
  jest.clearAllMocks();
  rpc.mockResolvedValue({ data: null, error: null } as never);
  resetPasswordForEmail.mockResolvedValue({ data: null, error: null } as never);
  updateUser.mockResolvedValue({ data: { user: null }, error: null } as never);
  signOut.mockResolvedValue({ error: null } as never);
});

describe('requestPasswordReset', () => {
  it('records the attempt before sending, and normalises the address', async () => {
    const order: string[] = [];
    rpc.mockImplementation((() => {
      order.push('rpc');
      return Promise.resolve({ data: null, error: null });
    }) as never);
    resetPasswordForEmail.mockImplementation((() => {
      order.push('email');
      return Promise.resolve({ data: null, error: null });
    }) as never);

    await requestPasswordReset('  Maya@Example.COM ');

    // Order matters: sending first would make the throttle advisory.
    expect(order).toEqual(['rpc', 'email']);
    expect(rpc).toHaveBeenCalledWith('record_password_reset_request', {
      p_email: 'maya@example.com',
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith('maya@example.com', {
      redirectTo: 'ligo://reset-password',
    });
  });

  it('does not send an email when the throttle refuses', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Too many reset requests for this address.' },
    } as never);

    await expect(requestPasswordReset('maya@example.com')).rejects.toThrow(ApiError);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('surfaces a mailer failure as an ApiError', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Error sending recovery email', status: 500 },
    } as never);

    await expect(requestPasswordReset('maya@example.com')).rejects.toThrow(ApiError);
  });
});

describe('completePasswordReset', () => {
  it('sets the password, closes the ledger entry, then signs the recovery session out', async () => {
    const order: string[] = [];
    updateUser.mockImplementation((() => {
      order.push('updateUser');
      return Promise.resolve({ data: { user: null }, error: null });
    }) as never);
    rpc.mockImplementation((() => {
      order.push('rpc');
      return Promise.resolve({ data: null, error: null });
    }) as never);
    signOut.mockImplementation((() => {
      order.push('signOut');
      return Promise.resolve({ error: null });
    }) as never);

    await completePasswordReset({ password: 'a-new-password' });

    expect(order).toEqual(['updateUser', 'rpc', 'signOut']);
    expect(updateUser).toHaveBeenCalledWith({ password: 'a-new-password' });
    // No address argument: the function reads the caller's own from the JWT,
    // so it cannot be pointed at someone else's ledger row.
    expect(rpc).toHaveBeenCalledWith('complete_password_reset_request');
  });

  it('does not sign out when the password was rejected', async () => {
    updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password should be at least 8 characters', status: 422 },
    } as never);

    await expect(completePasswordReset({ password: 'short' })).rejects.toThrow(ApiError);
    expect(signOut).not.toHaveBeenCalled();
  });
});
