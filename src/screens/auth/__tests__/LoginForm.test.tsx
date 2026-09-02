import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LoginForm from '@/screens/auth/LoginForm';

describe('LoginForm', () => {
  it('rejects a bad email and short password without calling onSubmit', async () => {
    const onSubmit = jest.fn();
    await render(<LoginForm onSubmit={onSubmit} submitting={false} />);

    await fireEvent.changeText(screen.getByPlaceholderText('name@example.com'), 'not-an-email');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'short');
    await fireEvent.press(screen.getByTestId('sign-in'));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    });
    expect(screen.getByText('Passwords are at least 8 characters.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid credentials', async () => {
    const onSubmit = jest.fn();
    await render(<LoginForm onSubmit={onSubmit} submitting={false} />);

    await fireEvent.changeText(screen.getByPlaceholderText('name@example.com'), 'coach@gym.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'strongpassword');
    await fireEvent.press(screen.getByTestId('sign-in'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { email: 'coach@gym.com', password: 'strongpassword' },
        expect.anything(),
      );
    });
  });
});
