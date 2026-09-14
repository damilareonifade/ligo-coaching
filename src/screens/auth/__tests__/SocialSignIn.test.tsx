import { fireEvent, render, screen } from '@testing-library/react-native';

import SocialSignIn from '@/components/auth/SocialSignIn';

describe('SocialSignIn', () => {
  it('offers Google and passkey, not GitHub', async () => {
    await render(<SocialSignIn onGoogle={jest.fn()} onPasskey={jest.fn()} />);

    expect(screen.getByText('Continue with Google')).toBeTruthy();
    expect(screen.getByText('Continue with a passkey')).toBeTruthy();
    expect(screen.queryByText(/github/i)).toBeNull();
  });

  it('calls the matching handler for each option', async () => {
    const onGoogle = jest.fn();
    const onPasskey = jest.fn();
    await render(<SocialSignIn onGoogle={onGoogle} onPasskey={onPasskey} />);

    await fireEvent.press(screen.getByTestId('continue-google'));
    expect(onGoogle).toHaveBeenCalledTimes(1);
    expect(onPasskey).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('continue-passkey'));
    expect(onPasskey).toHaveBeenCalledTimes(1);
  });

  it('disables both options while a sign-in is in flight', async () => {
    const onGoogle = jest.fn();
    await render(<SocialSignIn onGoogle={onGoogle} onPasskey={jest.fn()} busy />);

    await fireEvent.press(screen.getByTestId('continue-google'));
    expect(onGoogle).not.toHaveBeenCalled();
  });
});

describe('SocialSignIn without a passkey handler', () => {
  it('offers Google alone, under a caller-supplied label', async () => {
    await render(<SocialSignIn onGoogle={jest.fn()} label="Or create your account with" />);

    expect(screen.getByText('Or create your account with')).toBeTruthy();
    expect(screen.getByTestId('continue-google')).toBeTruthy();
    // The signup role screen has no passkey path, so the button must not
    // appear at all rather than appear and do nothing.
    expect(screen.queryByTestId('continue-passkey')).toBeNull();
  });
});
