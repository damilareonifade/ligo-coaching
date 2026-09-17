import { fireEvent, render, screen } from '@testing-library/react-native';

import { WelcomeAccountPicker } from '@/screens/welcome/WelcomeAccountPicker';
import type { LastAccount } from '@/store/lastAccountStore';

const account: LastAccount = {
  name: 'Amara Okafor',
  email: 'amara@example.com',
  role: 'client',
  avatarUrl: null,
};

function handlers() {
  return {
    onContinue: jest.fn(),
    onUseAnother: jest.fn(),
    onCreateAccount: jest.fn(),
    onForget: jest.fn(),
  };
}

describe('WelcomeAccountPicker', () => {
  it('offers the remembered account by name', async () => {
    const props = handlers();
    await render(<WelcomeAccountPicker account={account} {...props} />);

    expect(screen.getByText('Amara Okafor')).toBeTruthy();
    expect(screen.getByText('Training · amara@example.com')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('welcome-continue-saved'));
    expect(props.onContinue).toHaveBeenCalledTimes(1);
  });

  it('falls back to a plain sign in on a phone that has never been used', async () => {
    const props = handlers();
    await render(<WelcomeAccountPicker account={null} {...props} />);

    expect(screen.queryByTestId('welcome-continue-saved')).toBeNull();

    await fireEvent.press(screen.getByTestId('welcome-sign-in'));
    expect(props.onUseAnother).toHaveBeenCalledTimes(1);
  });

  it('only forgets the account once the dialog is answered', async () => {
    const props = handlers();
    await render(<WelcomeAccountPicker account={account} {...props} />);

    await fireEvent.press(screen.getByTestId('welcome-saved-menu'));
    expect(props.onForget).not.toHaveBeenCalled();
    // Signing in as the person is not what the menu button does.
    expect(props.onContinue).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('welcome-forget-confirm'));
    expect(props.onForget).toHaveBeenCalledTimes(1);
  });

  it('routes to signup from the footer', async () => {
    const props = handlers();
    await render(<WelcomeAccountPicker account={account} {...props} />);

    await fireEvent.press(screen.getByTestId('welcome-create-account'));
    expect(props.onCreateAccount).toHaveBeenCalledTimes(1);
  });
});
