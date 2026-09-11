import { existingAccountMessage } from '@/lib/authMessages';

describe('existingAccountMessage', () => {
  it('acknowledges the sign-in when the role matches what they picked', () => {
    expect(existingAccountMessage('coach', 'coach')).toBe(
      'You already have a Ligo account — signed you in.',
    );
  });

  it('names the account role when it differs from the one they picked', () => {
    // The case that would otherwise look like the role picker was ignored.
    const message = existingAccountMessage('client', 'coach');

    expect(message).toContain('as a client');
    expect(message).toContain('cannot be changed');
  });

  it('reads correctly in the other direction too', () => {
    expect(existingAccountMessage('coach', 'client')).toContain('as a coach');
  });
});
