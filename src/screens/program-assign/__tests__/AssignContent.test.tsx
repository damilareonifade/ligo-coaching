import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { ApiProgramDetail, ApiRosterClient } from '@/api/types';
import AssignContent from '@/screens/program-assign/AssignContent';

const mockAssign = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

jest.mock('@/api/coachPrograms', () => ({
  useAssignProgramMutation: () => ({ mutate: mockAssign, isPending: false }),
}));

function client(id: string, name: string): ApiRosterClient {
  return {
    id,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    meta: 'Upper/Lower · week 6',
    attention: 'none',
    access: 'partial',
    labelId: null,
  } as unknown as ApiRosterClient;
}

const clients = [client('rc-maya', 'Maya'), client('rc-tom', 'Tom'), client('rc-ana', 'Ana')];

function program(assignedIds: readonly string[]): ApiProgramDetail {
  return {
    id: 'pg-1',
    name: 'Upper/Lower 4×',
    note: null,
    meta: '12 weeks · 4 days',
    status: 'published',
    statusLabel: 'Published',
    assignedIds,
    assignedLabel: `Assigned to ${assignedIds.length} clients`,
    weeks: 12,
    sessionsPerWeek: 4,
    routines: [],
    hasDraftChanges: false,
  };
}

describe('AssignContent', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    mockAssign.mockClear();
    mockReplace.mockClear();
    alertSpy.mockClear();
  });

  it('shows every client, ticked where they already hold a copy', async () => {
    await render(<AssignContent program={program(['rc-maya'])} clients={clients} />);

    expect(screen.getByTestId('pick-rc-maya').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('pick-rc-tom').props.accessibilityState.checked).toBe(false);
  });

  it('saves nothing until something changes', async () => {
    await render(<AssignContent program={program(['rc-maya'])} clients={clients} />);

    await fireEvent.press(screen.getByTestId('program-assign-confirm'));
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it('assigns without asking — nobody loses anything', async () => {
    await render(<AssignContent program={program(['rc-maya'])} clients={clients} />);

    await fireEvent.press(screen.getByTestId('pick-rc-tom'));
    await fireEvent.press(screen.getByTestId('program-assign-confirm'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockAssign.mock.calls[0][0]).toEqual({
      programId: 'pg-1',
      clientIds: ['rc-maya', 'rc-tom'],
      currentIds: ['rc-maya'],
    });
  });

  /**
   * Unassigning destroys a copy the client may have changed and may be
   * training from, so it is named and confirmed before anything is sent.
   */
  it('asks by name before taking a copy back', async () => {
    await render(<AssignContent program={program(['rc-maya', 'rc-tom'])} clients={clients} />);

    await fireEvent.press(screen.getByTestId('pick-rc-maya'));
    await fireEvent.press(screen.getByTestId('program-assign-confirm'));

    expect(mockAssign).not.toHaveBeenCalled();

    const [title, body, buttons = []] = alertSpy.mock.calls[0];
    expect(title).toContain('1 client');
    expect(body).toContain('Maya');
    expect(body).toContain('changes they made');

    buttons.find((button) => button.text === 'Unassign')?.onPress?.();
    expect(mockAssign.mock.calls[0][0].clientIds).toEqual(['rc-tom']);
  });

  it('keeps the copy when the confirm is cancelled', async () => {
    await render(<AssignContent program={program(['rc-maya'])} clients={clients} />);

    await fireEvent.press(screen.getByTestId('pick-rc-maya'));
    await fireEvent.press(screen.getByTestId('program-assign-confirm'));

    const buttons = alertSpy.mock.calls[0][2] ?? [];
    buttons.find((button) => button.text === 'Cancel')?.onPress?.();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it('says what is about to change', async () => {
    await render(<AssignContent program={program(['rc-maya'])} clients={clients} />);

    await fireEvent.press(screen.getByTestId('pick-rc-tom'));
    expect(screen.getByText('1 client added')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('pick-rc-maya'));
    expect(screen.getByText('1 client added · 1 client removed')).toBeTruthy();
  });

  /** Back to the program, which is where the assignment shows. */
  it('returns to the program rather than the tab root', async () => {
    await render(<AssignContent program={program([])} clients={clients} />);

    await fireEvent.press(screen.getByTestId('pick-rc-tom'));
    await fireEvent.press(screen.getByTestId('program-assign-confirm'));

    mockAssign.mock.calls[0][1].onSuccess();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/programs/[id]',
      params: { id: 'pg-1' },
    });
  });
});
