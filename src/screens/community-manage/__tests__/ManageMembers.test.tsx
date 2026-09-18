import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiCommunityMember } from '@/api/types';
import ManageMembers from '@/screens/community-manage/ManageMembers';

const ME = 'me-1';

function member(overrides: Partial<ApiCommunityMember> = {}): ApiCommunityMember {
  return {
    clientId: 'them-1',
    displayName: 'Maya A.',
    initials: 'MA',
    isCoach: false,
    isAdmin: false,
    ...overrides,
  };
}

const people = [
  member({ clientId: ME, displayName: 'Sam O.', isAdmin: true }),
  member(),
  member({ clientId: 'them-2', displayName: 'Priya B.', isCoach: true }),
];

function renderList(isAdmin: boolean, handlers = {}) {
  return render(
    <ManageMembers
      members={people}
      meId={ME}
      isAdmin={isAdmin}
      onSetAdmin={jest.fn()}
      onRemove={jest.fn()}
      {...handlers}
    />,
  );
}

describe('ManageMembers', () => {
  it('names everybody, which the four faces on the group card never did', async () => {
    await renderList(false);

    expect(screen.getByText('Maya A.')).toBeTruthy();
    expect(screen.getByText('Priya B.')).toBeTruthy();
    expect(screen.getByText('3 members')).toBeTruthy();
  });

  it('marks the reader so they are not looking for themselves', async () => {
    await renderList(false);

    expect(screen.getByText('Sam O. (you)')).toBeTruthy();
  });

  it('offers nothing to do to anybody when the reader does not run the group', async () => {
    await renderList(false);

    expect(screen.queryByTestId('manage-admin-them-1')).toBeNull();
    expect(screen.queryByTestId('manage-remove-them-1')).toBeNull();
  });

  it('offers an admin the actions, but never against their own row', async () => {
    await renderList(true);

    expect(screen.getByTestId('manage-admin-them-1')).toBeTruthy();
    // Standing yourself down goes through leaving, which is the only path that
    // knows what happens when the last admin goes.
    expect(screen.queryByTestId(`manage-admin-${ME}`)).toBeNull();
    expect(screen.queryByTestId(`manage-remove-${ME}`)).toBeNull();
  });

  it('promotes somebody who is not an admin, and demotes one who is', async () => {
    const onSetAdmin = jest.fn();
    await renderList(true, { onSetAdmin });

    await fireEvent.press(screen.getByTestId('manage-admin-them-1'));

    expect(onSetAdmin).toHaveBeenCalledWith('them-1', true);
  });

  it('asks before removing somebody, and says what survives it', async () => {
    const onRemove = jest.fn();
    await renderList(true, { onRemove });

    await fireEvent.press(screen.getByTestId('manage-remove-them-1'));
    expect(onRemove).not.toHaveBeenCalled();

    // The promise the database keeps: they are marked as left, and their turns
    // stay in the thread.
    expect(
      screen.getByText(/What they already said stays in the thread/),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('manage-remove-confirm'));
    expect(onRemove).toHaveBeenCalledWith('them-1');
  });
});
