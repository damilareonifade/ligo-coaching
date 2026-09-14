import { render, screen, fireEvent } from '@testing-library/react-native';

import type { ApiSharePermissionsDetail } from '@/api/types';
import PermissionsContent from '@/screens/profile-permissions/PermissionsContent';

const mockSetPermission = jest.fn();
const mockSetLogFor = jest.fn();

jest.mock('@/api/clientProfile', () => ({
  useSetSharePermissionMutation: () => ({ mutate: mockSetPermission, isPending: false }),
  useSetLogForMutation: () => ({ mutate: mockSetLogFor, isPending: false }),
}));

const detail: ApiSharePermissionsDetail = {
  coachName: 'Sam Okafor',
  permissions: {
    workouts: true,
    nutrition: false,
    metrics: false,
    health: false,
    monthly: true,
  },
  logFor: false,
};

beforeEach(() => {
  mockSetPermission.mockClear();
  mockSetLogFor.mockClear();
});

describe('PermissionsContent', () => {
  it('shows a switch for every domain, plus logging', async () => {
    await render(<PermissionsContent detail={detail} />);

    for (const key of ['workouts', 'nutrition', 'metrics', 'health', 'monthly']) {
      expect(screen.getByTestId(`permission-${key}`)).toBeTruthy();
    }
    expect(screen.getByTestId('permission-log-for')).toBeTruthy();
  });

  // The whole point of the screen: granting used to be a one-way door.
  it('turns something off', async () => {
    await render(<PermissionsContent detail={detail} />);

    await fireEvent.press(screen.getByTestId('permission-workouts'));

    expect(mockSetPermission).toHaveBeenCalledWith(
      { domain: 'workouts', shared: false },
      expect.anything(),
    );
  });

  it('turns something on', async () => {
    await render(<PermissionsContent detail={detail} />);

    await fireEvent.press(screen.getByTestId('permission-metrics'));

    expect(mockSetPermission).toHaveBeenCalledWith(
      { domain: 'metrics', shared: true },
      expect.anything(),
    );
  });

  it('keeps logging separate from the five reads', async () => {
    await render(<PermissionsContent detail={detail} />);

    await fireEvent.press(screen.getByTestId('permission-log-for'));

    expect(mockSetLogFor).toHaveBeenCalledWith(true, expect.anything());
    expect(mockSetPermission).not.toHaveBeenCalled();
  });

  it('names the coach rather than saying "your coach"', async () => {
    await render(<PermissionsContent detail={detail} />);

    expect(screen.getByText(/^Sam sees only what is on below/)).toBeTruthy();
  });
});
