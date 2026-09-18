import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiGroupBoard } from '@/api/types';
import ManageBoards from '@/screens/community-manage/ManageBoards';

function board(overrides: Partial<ApiGroupBoard> = {}): ApiGroupBoard {
  return {
    id: 'brd-1',
    metric: 'volume',
    label: 'Total volume lifted',
    optedIn: false,
    rankedCount: 2,
    ...overrides,
  };
}

function renderBoards(boards: readonly ApiGroupBoard[], isAdmin: boolean, handlers = {}) {
  return render(
    <ManageBoards
      boards={boards}
      isAdmin={isAdmin}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
      onOpen={jest.fn()}
      {...handlers}
    />,
  );
}

describe('ManageBoards', () => {
  it('says a group ranks nothing rather than showing an empty list', async () => {
    await renderBoards([], true);

    expect(screen.getByText(/This group ranks nothing yet/)).toBeTruthy();
  });

  it('counts who is on that ranking, not who is in the group', async () => {
    // Appearing is answered per ranking, so "2 ranked" is about this one.
    await renderBoards([board({ rankedCount: 2 })], false);

    expect(screen.getByText('2 ranked')).toBeTruthy();
  });

  it('lets a group rank several things, offering only what it does not already', async () => {
    const onAdd = jest.fn();
    await renderBoards([board({ metric: 'volume' })], true, { onAdd });

    await fireEvent.press(screen.getByTestId('manage-board-add'));

    // Already ranked, so not on offer — ranking the same thing twice is the
    // same ranking, and the database refuses it anyway.
    expect(screen.queryByTestId('manage-board-pick-volume')).toBeNull();
    expect(screen.getByTestId('manage-board-pick-sessions')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('manage-board-pick-sessions'));
    expect(onAdd).toHaveBeenCalledWith('sessions');
  });

  it('offers a member no way to change what the group ranks', async () => {
    await renderBoards([board()], false);

    expect(screen.queryByTestId('manage-board-add')).toBeNull();
    expect(screen.queryByTestId('manage-board-remove-brd-1')).toBeNull();
  });

  it('warns that removing a ranking takes everybody’s consent with it', async () => {
    const onRemove = jest.fn();
    await renderBoards([board()], true, { onRemove });

    await fireEvent.press(screen.getByTestId('manage-board-remove-brd-1'));
    expect(onRemove).not.toHaveBeenCalled();

    // What the cascade does, said before it happens.
    expect(screen.getByText(/asks all of them afresh/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('manage-board-remove-confirm'));
    expect(onRemove).toHaveBeenCalledWith('brd-1');
  });

  it('opens a ranking from its name', async () => {
    const onOpen = jest.fn();
    await renderBoards([board()], false, { onOpen });

    await fireEvent.press(screen.getByTestId('manage-board-brd-1'));

    expect(onOpen).toHaveBeenCalledWith('brd-1');
  });
});
