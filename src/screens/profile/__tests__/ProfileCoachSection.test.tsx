import { render, screen, fireEvent } from '@testing-library/react-native';

import type { ApiClientCoachSummary, ApiSettingsRow } from '@/api/types';
import ProfileCoachSection from '@/screens/profile/ProfileCoachSection';

const mockDetach = jest.fn();
jest.mock('@/api/clientProfile', () => ({
  useDetachCoachMutation: () => ({ mutate: mockDetach, isPending: false }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  Link: () => null,
}));

const coach: ApiClientCoachSummary = {
  id: 'coach-sam',
  name: 'Sam Okafor',
  initials: 'SO',
  line1: 'Sam Okafor',
  line2: 'Ironworks Lagos',
  permissionLabel: '3 of 5',
};

const rows: readonly ApiSettingsRow[] = [
  {
    id: 'permissions',
    label: 'Permissions',
    desc: 'What Sam can see',
    route: '/profile/permissions',
  },
  { id: 'detach', label: 'Detach coach', desc: 'Ends access immediately.', danger: true },
];

beforeEach(() => {
  mockDetach.mockClear();
  mockPush.mockClear();
});

describe('ProfileCoachSection', () => {
  it('renders the detach row', async () => {
    await render(<ProfileCoachSection coach={coach} rows={rows} />);

    expect(screen.getByTestId('profile-row-detach')).toBeTruthy();
  });

  /**
   * The regression this covers: the confirmation used to be a bottom sheet
   * that sized itself by measuring its content, and a tap produced nothing at
   * all — no dialog, no error. This asserts the dialog is actually in the tree.
   */
  it('opens the dialog on the first tap, and does not detach yet', async () => {
    await render(<ProfileCoachSection coach={coach} rows={rows} />);

    await fireEvent.press(screen.getByTestId('profile-row-detach'));

    expect(screen.getByTestId('detach-coach-sheet')).toBeTruthy();
    expect(mockDetach).not.toHaveBeenCalled();
  });

  it('names the coach and says what survives', async () => {
    await render(<ProfileCoachSection coach={coach} rows={rows} />);
    await fireEvent.press(screen.getByTestId('profile-row-detach'));

    expect(screen.getByText('Detach from Sam Okafor?')).toBeTruthy();
    expect(screen.getByText(/You keep everything\./)).toBeTruthy();
    expect(screen.getByText('Your data stays yours')).toBeTruthy();
    expect(screen.getByText('Programs remain')).toBeTruthy();
  });

  it('detaches only once the dialog is confirmed', async () => {
    await render(<ProfileCoachSection coach={coach} rows={rows} />);

    await fireEvent.press(screen.getByTestId('profile-row-detach'));
    await fireEvent.press(screen.getByTestId('leave-confirm'));

    expect(mockDetach).toHaveBeenCalled();
  });

  it('closes without detaching when the way out is taken', async () => {
    await render(<ProfileCoachSection coach={coach} rows={rows} />);

    await fireEvent.press(screen.getByTestId('profile-row-detach'));
    await fireEvent.press(screen.getByTestId('leave-dismiss'));

    expect(mockDetach).not.toHaveBeenCalled();
    expect(screen.queryByTestId('detach-coach-sheet')).toBeNull();
  });

  it('offers a coach instead of rows when there is none', async () => {
    await render(<ProfileCoachSection coach={null} rows={[]} />);

    expect(screen.getByTestId('profile-add-coach')).toBeTruthy();
    expect(screen.queryByTestId('profile-row-detach')).toBeNull();
  });
});
