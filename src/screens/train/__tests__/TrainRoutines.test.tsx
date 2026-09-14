import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { ApiRoutine } from '@/api/types';
import TrainRoutines from '@/screens/train/TrainRoutines';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const routines: readonly ApiRoutine[] = [
  {
    id: 'rou-1',
    name: 'Upper/Lower 4×',
    note: 'Four days a week.',
    isCurrent: true,
    owner: 'coach',
    sourceLabel: 'From Sam',
    preview: [{ name: 'Bench press', scheme: '4 × 8' }],
    diverged: false,
    lastCompletedAt: null,
    pendingUpdate: null,
  },
  {
    id: 'rou-2',
    name: 'Push Pull Legs',
    note: null,
    isCurrent: false,
    owner: 'you',
    sourceLabel: 'Yours',
    preview: [{ name: 'Overhead press', scheme: '3 × 10' }],
    diverged: false,
    lastCompletedAt: null,
    pendingUpdate: null,
  },
];

function renderRoutines(overrides: Partial<React.ComponentProps<typeof TrainRoutines>> = {}) {
  return render(
    <TrainRoutines
      routines={routines}
      week={overrides.week ?? { done: 2, target: 4 }}
      onStart={overrides.onStart ?? (() => {})}
      onDelete={overrides.onDelete ?? (() => {})}
      onDeleteAll={overrides.onDeleteAll ?? (() => {})}
      onDecideUpdate={overrides.onDecideUpdate ?? (() => {})}
      decidingId={overrides.decidingId ?? null}
      startingId={overrides.startingId ?? null}
      disabled={overrides.disabled ?? false}
    />,
  );
}

describe('TrainRoutines', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    mockPush.mockClear();
    alertSpy.mockClear();
  });

  it('starts a workout from a saved routine', async () => {
    const onStart = jest.fn();
    await renderRoutines({ onStart });

    await fireEvent.press(screen.getByTestId('routine-start-rou-2'));
    expect(onStart).toHaveBeenCalledWith('rou-2');
  });

  it('runs a coach routine too', async () => {
    const onStart = jest.fn();
    await renderRoutines({ onStart });

    await fireEvent.press(screen.getByTestId('routine-start-rou-1'));
    expect(onStart).toHaveBeenCalledWith('rou-1');
  });

  /**
   * Copy on assign: what a client holds is their own copy, so both are theirs
   * to change. This deliberately reverses the earlier rule that a coach's
   * routine was read-only — under a pointer model that was right, under a copy
   * model it is not.
   */
  it('opens every routine for editing, the coach’s included', async () => {
    await renderRoutines();

    await fireEvent.press(screen.getByTestId('routine-edit-rou-1'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/routines/[id]', params: { id: 'rou-1' } });

    await fireEvent.press(screen.getByTestId('routine-edit-rou-2'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/routines/[id]', params: { id: 'rou-2' } });
  });

  /** Every routine carries the card the promoted "Next up" slot used to. */
  it('gives every routine a card with its source and its lifts', async () => {
    await renderRoutines();

    expect(screen.getByTestId('routine-card-rou-1')).toBeTruthy();
    expect(screen.getByTestId('routine-card-rou-2')).toBeTruthy();

    // The source line now carries the rotation: the next one says so, the
    // rest say when they were last done.
    expect(screen.getByText('From Sam · up next')).toBeTruthy();
    expect(screen.getByText('Yours · never done')).toBeTruthy();
    expect(screen.getByText('Bench press')).toBeTruthy();
    expect(screen.getByText('Overhead press')).toBeTruthy();
  });

  it('builds a new routine', async () => {
    await renderRoutines();

    await fireEvent.press(screen.getByTestId('train-build-routine'));
    expect(mockPush).toHaveBeenCalledWith('/routines/new');
  });

  /** A target, never a schedule — it counts work done, not days missed. */
  it('reports the week against the target, and copes with no routines', async () => {
    await renderRoutines();
    expect(screen.getByText('2 of 4 this week')).toBeTruthy();

    await render(
      <TrainRoutines
        routines={[]}
        week={{ done: 0, target: 3 }}
        onStart={() => {}}
        onDelete={() => {}}
        onDeleteAll={() => {}}
        onDecideUpdate={() => {}}
        decidingId={null}
        startingId={null}
        disabled={false}
      />,
    );
    expect(
      screen.getByText('No routines yet. Build one below, or ask your coach for a plan.'),
    ).toBeTruthy();
  });

  /**
   * Deleting is destructive, so it goes through a native alert rather than
   * firing on the tap — these assert the wiring behind the confirm.
   */
  it('offers delete on every routine', async () => {
    await renderRoutines();

    expect(screen.getByTestId('routine-delete-rou-1')).toBeTruthy();
    expect(screen.getByTestId('routine-delete-rou-2')).toBeTruthy();
  });

  /**
   * Removing a copy is not deleting the coach's routine, and the prompt has to
   * say which one is happening — the two acts are worlds apart in consequence.
   */
  it('asks to remove a copy, not to delete the coach’s routine', async () => {
    await renderRoutines();

    await fireEvent.press(screen.getByTestId('routine-delete-rou-1'));
    const [coachTitle, coachBody] = alertSpy.mock.calls[0];
    expect(coachTitle).toBe('Remove Upper/Lower 4×?');
    expect(coachBody).toContain('Your coach keeps theirs');

    alertSpy.mockClear();

    await fireEvent.press(screen.getByTestId('routine-delete-rou-2'));
    const [ownTitle] = alertSpy.mock.calls[0];
    expect(ownTitle).toBe('Delete Push Pull Legs?');
  });

  it('deletes one once the alert is confirmed', async () => {
    const onDelete = jest.fn();
    await renderRoutines({ onDelete });

    await fireEvent.press(screen.getByTestId('routine-delete-rou-2'));

    const buttons = alertSpy.mock.calls[0][2] ?? [];
    buttons.find((button) => button.text === 'Delete')?.onPress?.();
    expect(onDelete).toHaveBeenCalledWith('rou-2');
  });

  it('does nothing when the alert is cancelled', async () => {
    const onDelete = jest.fn();
    await renderRoutines({ onDelete });

    await fireEvent.press(screen.getByTestId('routine-delete-rou-2'));

    const buttons = alertSpy.mock.calls[0][2] ?? [];
    buttons.find((button) => button.text === 'Cancel')?.onPress?.();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('clears all the client’s own, counted and named in the prompt', async () => {
    const onDeleteAll = jest.fn();
    await renderRoutines({ onDeleteAll });

    await fireEvent.press(screen.getByTestId('train-delete-all-routines'));

    const [title, body, buttons = []] = alertSpy.mock.calls[0];
    expect(title).toBe('Delete all 1 of your routines?');
    expect(body).toContain('coach');

    buttons.find((button) => button.text === 'Delete all')?.onPress?.();
    expect(onDeleteAll).toHaveBeenCalledTimes(1);
  });

  it('hides delete-all when the client owns none', async () => {
    await render(
      <TrainRoutines
        routines={[routines[0]]}
        week={{ done: 0, target: 3 }}
        onStart={() => {}}
        onDelete={() => {}}
        onDeleteAll={() => {}}
        onDecideUpdate={() => {}}
        decidingId={null}
        startingId={null}
        disabled={false}
      />,
    );

    expect(screen.queryByTestId('train-delete-all-routines')).toBeNull();
  });
});
