import { fireEvent, render, screen } from '@testing-library/react-native';

import SessionHeader from '@/screens/session/SessionHeader';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRename = jest.fn();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}));

describe('SessionHeader', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockRename.mockClear();
  });

  it('reads as the workout in progress', async () => {
    await render(<SessionHeader title="Upper A" onRename={mockRename} />);

    expect(screen.getByText('Train')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.getByText('Upper A')).toBeTruthy();
    expect(screen.getByText('Client')).toBeTruthy();
  });

  it('goes back to Train', async () => {
    await render(<SessionHeader title="Upper A" onRename={mockRename} />);

    await fireEvent.press(screen.getByTestId('session-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // The bell lives on Today now, on both sides. Mid-set is the worst place to
  // offer a way off the screen, and what it opened was a settings form.
  it('carries no bell', async () => {
    await render(<SessionHeader title="Upper A" onRename={mockRename} />);

    expect(screen.queryByTestId('session-notifications')).toBeNull();
  });

  it('renames the workout in place', async () => {
    await render(
      <SessionHeader title="Upper A" onRename={mockRename} />,
    );

    await fireEvent.press(screen.getByTestId('session-title'));
    await fireEvent.changeText(screen.getByTestId('session-title-input'), 'Push day');
    await fireEvent(screen.getByTestId('session-title-input'), 'submitEditing');

    expect(mockRename).toHaveBeenCalledWith('Push day');
  });

  /** A workout with no name is worse than one still called "Upper A". */
  it('keeps the old name when the box is emptied', async () => {
    await render(
      <SessionHeader title="Upper A" onRename={mockRename} />,
    );

    await fireEvent.press(screen.getByTestId('session-title'));
    await fireEvent.changeText(screen.getByTestId('session-title-input'), '   ');
    await fireEvent(screen.getByTestId('session-title-input'), 'submitEditing');

    expect(mockRename).not.toHaveBeenCalled();
    expect(screen.getByText('Upper A')).toBeTruthy();
  });

  it('does not write when the name is unchanged', async () => {
    await render(
      <SessionHeader title="Upper A" onRename={mockRename} />,
    );

    await fireEvent.press(screen.getByTestId('session-title'));
    await fireEvent(screen.getByTestId('session-title-input'), 'submitEditing');

    expect(mockRename).not.toHaveBeenCalled();
  });
});
